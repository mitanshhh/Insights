from fastapi import Request

def get_token_from_request(request: Request) -> str:
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header[7:]
    
    token = request.cookies.get('auth_token')
    if token:
        return token
    
    return "anonymous_session"

def decode_token(token: str) -> str:
    return token
