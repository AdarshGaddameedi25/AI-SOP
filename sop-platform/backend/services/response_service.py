
from flask import jsonify


def success_response(data: dict | list, message: str | None = None, status_code: int = 200):
    payload: dict = {"success": True, "data": data}
    if message:
        payload["message"] = message
    return jsonify(payload), status_code


def created_response(data: dict | list, message: str):
    return success_response(data, message=message, status_code=201)


def error_response(message: str, status_code: int = 400):
    payload = {"success": False, "error": message}
    return jsonify(payload), status_code


def not_found_response(message: str):
    return error_response(message, status_code=404)


def unauthorized_response(message: str = "Authentication required."):
    return error_response(message, status_code=401)


def forbidden_response(message: str = "You do not have permission to perform this action."):
    return error_response(message, status_code=403)


def server_error_response(message: str = "An unexpected server error occurred."):
    return error_response(message, status_code=500)

