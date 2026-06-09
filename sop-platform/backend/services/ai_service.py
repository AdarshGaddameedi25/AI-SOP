
import json
import logging
import os
import re
import requests
import google.generativeai as genai

logger = logging.getLogger(__name__)

def _get_ai_configs() -> list[dict]:

    try:
        from dotenv import load_dotenv
        dotenv_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".env"))
        if os.path.exists(dotenv_path):
            load_dotenv(dotenv_path, override=True)
        else:
            load_dotenv(override=True)
    except Exception as e:
        logger.warning("Could not dynamically reload .env file: %s", e)

    configs = []
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        configs.append({"provider": "gemini", "key": gemini_key, "model": "gemini-2.5-flash"})

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    if openrouter_key:
        configs.append({
            "provider": "openrouter", 
            "key": openrouter_key, 
            "model": os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
        })

    if not configs:
        raise EnvironmentError("Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set.")

    return configs


_PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")


def _load_prompt(filename: str) -> str:

    path = os.path.normpath(os.path.join(_PROMPTS_DIR, filename))
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def _strip_markdown_fences(text: str) -> str:

    text = text.strip()
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _call_llm(prompt: str) -> tuple[str | None, str | None]:
    try:
        configs = _get_ai_configs()
    except EnvironmentError as exc:
        logger.error("AI configuration error: %s", exc)
        return None, str(exc)

    last_error = "No API providers available."
    
    for config in configs:
        provider = config["provider"]
        api_key = config["key"]
        model = config["model"]
        
        try:
            if provider == "gemini":
                genai.configure(api_key=api_key)
                generative_model = genai.GenerativeModel(model)
                full_prompt = f"You are a helpful AI assistant that outputs only valid JSON data as requested.\n\n{prompt}"
                logger.info(f"Sending request to Gemini using model: {model}")
                
                response = generative_model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        max_output_tokens=8192,
                        response_mime_type="application/json",
                    )
                )
                raw = response.text
                logger.info("Gemini raw response length: %d chars.", len(raw))
                return raw, None

            elif provider == "openrouter":
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "SOP Platform"
                }
                url = "https://openrouter.ai/api/v1/chat/completions"
                data = {
                    "model": model,
                    "messages": [
                        {"role": "user", "content": f"You are a helpful AI assistant that outputs only valid JSON data as requested.\n\n{prompt}"}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 2048,
                }
                
                logger.info(f"Sending request to openrouter using model: {model}")
                response = requests.post(
                    url=url,
                    headers=headers,
                    json=data,
                    timeout=300
                )
                
                if response.status_code != 200:
                    last_error = f"openrouter API error: {response.status_code}"
                    logger.error(last_error)
                    continue
                    
                res_json = response.json()
                raw = res_json["choices"][0]["message"]["content"]
                
                logger.info("openrouter raw response length: %d chars.", len(raw))
                return raw, None
                
        except Exception as exc:
            logger.warning("%s API call failed. Error: %s", provider, exc)
            last_error = str(exc)
            
    return None, f"All AI services failed. Last error: {last_error}"


def _parse_and_validate_json(raw_text: str, required_keys: list[str]) -> tuple[dict | None, str | None]:

    cleaned = _strip_markdown_fences(raw_text)
    
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*]', ']', cleaned)
    
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("JSON parse failure: %s | raw snippet: %.200s", exc, cleaned)
        return None, "AI returned a response that could not be parsed as JSON."

    if not isinstance(parsed, dict):
        return None, "AI response is not a JSON object."

    missing = [k for k in required_keys if k not in parsed or not parsed[k]]
    if missing:
        return None, f"AI response is missing required fields: {', '.join(missing)}."

    return parsed, None


def generate_sop_content(
    title: str,
    template_type: str,
    description: str,
    sop_number: str = "TBD",
    version: str = "1.0",
    extra_instructions: str = "",
) -> tuple[dict | None, str | None]:
    
    required_keys = [
        "purpose",
        "scope",
        "responsibilities",
        "procedure",
        "references",
    ]

    try:
        prompt_template = _load_prompt("sop_generation.txt")
    except FileNotFoundError:
        logger.error("Prompt file 'sop_generation.txt' not found.")
        return None, "Server configuration error: SOP generation prompt is missing."

    prompt = (
        prompt_template
        .replace("{extra_instructions}", f" AUTHOR INSTRUCTIONS (must be followed):\n{extra_instructions.strip()}" if extra_instructions.strip() else "")
        .replace("{title}", title)
        .replace("{sop_number}", sop_number)
        .replace("{version}", version)
        .replace("{template_type}", template_type)
        .replace("{description}", description)
    )

    for attempt in range(1, 3):
        logger.info("SOP generation attempt %d for title=%r", attempt, title)
        raw, api_error = _call_llm(prompt)

        if api_error:
            return None, api_error

        parsed, parse_error = _parse_and_validate_json(raw, required_keys)

        if parse_error:
            logger.warning("Attempt %d validation failed: %s", attempt, parse_error)
            if attempt == 2:
                return None, "AI could not produce a valid SOP after two attempts. Please try again."
            continue

        if not isinstance(parsed.get("procedure"), list) or len(parsed.get("procedure", [])) == 0:
            logger.warning("Attempt %d: 'procedure' is not a list or is empty.", attempt)
            if attempt == 2:
                return None, "AI returned an invalid procedure format. Please try again."
            continue

        if not isinstance(parsed.get("references"), list):
            logger.warning("Attempt %d: 'references' is not a list.", attempt)
            if attempt == 2:
                return None, "AI returned an invalid references format. Please try again."
            continue

        for list_field in ("responsibilities", "procedure", "references"):
            if list_field in parsed and not isinstance(parsed[list_field], list):
                logger.warning("Attempt %d: '%s' is not a list — coercing to [].", attempt, list_field)
                parsed[list_field] = []

        procedure = parsed.get("procedure", [])
        for i, step in enumerate(procedure):
            if not isinstance(step, dict):
                procedure[i] = {
                    "step_number": str(i + 1),
                    "step_title": "Step",
                    "performed_by": "Responsible Party",
                    "action": str(step),
                    "verification": "",
                    "data_integrity_note": "",
                    "exception_handling": "",
                }

        logger.info("SOP generation succeeded on attempt %d.", attempt)
        return parsed, None

    return None, "AI could not produce a valid SOP. Please try again."



def _trim_sop_for_audit(sop_content: dict, max_steps: int = 15, max_field_chars: int = 1500) -> dict:

    import copy
    trimmed = copy.deepcopy(sop_content)


    procedure = trimmed.get("procedure")
    if isinstance(procedure, list) and len(procedure) > max_steps:
        logger.info(
            "Trimming SOP procedure from %d steps to %d for audit prompt.",
            len(procedure), max_steps,
        )
        trimmed["procedure"] = procedure[:max_steps]


    for key, value in trimmed.items():
        if isinstance(value, str) and len(value) > max_field_chars:
            trimmed[key] = value[:max_field_chars] + " [...truncated for audit]"

    return trimmed


def _classify_compliance_score(score: int) -> str:

    if score >= 90:
        return "Audit Ready"
    elif score >= 75:
        return "Minor Gaps"
    elif score >= 60:
        return "Moderate Gaps"
    else:
        return "Major Revision Required"


def run_compliance_check(sop_content: dict) -> tuple[dict | None, str | None]:

    required_keys = ["compliance_score", "classification", "audit_results", "recommendations"]

    try:
        prompt_template = _load_prompt("compliance_check.txt")
    except FileNotFoundError:
        logger.error("Prompt file 'compliance_check.txt' not found.")
        return None, "Server configuration error: compliance check prompt is missing."

    content_str = json.dumps(_trim_sop_for_audit(sop_content), separators=(',', ':'))
    prompt = prompt_template.replace("{sop_content}", content_str)

    for attempt in range(1, 3):
        logger.info("Compliance check attempt %d", attempt)
        raw, api_error = _call_llm(prompt)

        if api_error:
            return None, api_error

        parsed, parse_error = _parse_and_validate_json(raw, required_keys)

        if parse_error:
            logger.warning("Compliance check attempt %d failed: %s", attempt, parse_error)
            if attempt == 2:
                return None, "AI could not produce a valid compliance report after two attempts."
            continue

        try:
            score = max(0, min(100, int(parsed.get("compliance_score", 0))))
        except (TypeError, ValueError):
            score = 0
        parsed["compliance_score"] = score

        valid_classifications = [
            "Audit Ready", "Minor Gaps", "Moderate Gaps", "Major Revision Required"
        ]
        if parsed.get("classification") not in valid_classifications:
            parsed["classification"] = _classify_compliance_score(score)

        for int_field in ("total_checks", "passed_checks", "failed_checks"):
            try:
                parsed[int_field] = int(parsed.get(int_field, 0))
            except (TypeError, ValueError):
                parsed[int_field] = 0

        for list_field in ("critical_failures", "recommendations", "missing_sections"):
            if not isinstance(parsed.get(list_field), list):
                parsed[list_field] = []

        audit_results = parsed.get("audit_results")
        if not isinstance(audit_results, dict):
            parsed["audit_results"] = {}
        else:
            for category in (
                "structural_completeness",
                "data_integrity", "cfr_part_11", "language_quality",
            ):
                if not isinstance(audit_results.get(category), list):
                    audit_results[category] = []

        logger.info("Compliance check succeeded on attempt %d.", attempt)
        return parsed, None

    return None, "AI compliance check failed. Please try again."


def run_security_classification(
    title: str,
    description: str,
    content: dict,
) -> tuple[dict | None, str | None]:

    required_keys = [
        "security_risk_level",
        "gxp_classification",
        "information_security_classification",
        "safety_risk_level",
        "recommended_controls",
    ]

    try:
        prompt_template = _load_prompt("security_classification.txt")
    except FileNotFoundError:
        logger.error("Prompt file 'security_classification.txt' not found.")
        return None, "Server configuration error: security classification prompt is missing."

    content_str = json.dumps(content, separators=(",", ":"))
    prompt = (
        prompt_template
        .replace("{title}", title)
        .replace("{description}", description)
        .replace("{content_json}", content_str)
    )

    for attempt in range(1, 3):
        logger.info("Security classification attempt %d for title=%r", attempt, title)
        raw, api_error = _call_llm(prompt)

        if api_error:
            return None, api_error

        parsed, parse_error = _parse_and_validate_json(raw, required_keys)

        if parse_error:
            logger.warning("Classification attempt %d failed: %s", attempt, parse_error)
            if attempt == 2:
                return None, "AI could not produce a valid classification after two attempts."
            continue

        
        if not isinstance(parsed.get("recommended_controls"), list):
            parsed["recommended_controls"] = []

        logger.info("Security classification succeeded on attempt %d.", attempt)
        return parsed, None

    return None, "AI security classification failed. Please try again."



