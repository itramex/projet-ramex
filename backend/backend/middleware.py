"""
Custom middleware for rate limiting token endpoints.
"""
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
import time


class TokenRateLimitMiddleware(MiddlewareMixin):
    """
    Middleware to rate limit token endpoints.
    
    Rate limits:
    - /api/token/ (login): 5 requests per minute per IP
    - /api/token/refresh/: 10 requests per minute per IP
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        Check rate limits before processing the request.
        """
        path = request.path
        
        # Define rate limits for different endpoints
        rate_limits = {
            '/api/token/': {'limit': 5, 'period': 60},  # 5 requests per minute
            '/api/token/refresh/': {'limit': 10, 'period': 60},  # 10 requests per minute
        }
        
        # Check if the path matches any rate-limited endpoint
        for endpoint, config in rate_limits.items():
            if path == endpoint:
                # Get client IP address
                ip_address = self.get_client_ip(request)
                
                # Create cache key
                cache_key = f'ratelimit:{endpoint}:{ip_address}'
                
                # Get current request count and timestamp
                request_data = cache.get(cache_key, {'count': 0, 'reset_time': time.time() + config['period']})
                
                current_time = time.time()
                
                # Reset counter if period has elapsed
                if current_time >= request_data['reset_time']:
                    request_data = {'count': 0, 'reset_time': current_time + config['period']}
                
                # Check if limit exceeded
                if request_data['count'] >= config['limit']:
                    retry_after = int(request_data['reset_time'] - current_time)
                    return JsonResponse(
                        {
                            'error': 'Rate limit exceeded',
                            'detail': f'Too many requests. Please try again in {retry_after} seconds.',
                            'retry_after': retry_after
                        },
                        status=429
                    )
                
                # Increment counter
                request_data['count'] += 1
                cache.set(cache_key, request_data, config['period'])
        
        return None
    
    def get_client_ip(self, request):
        """
        Get the client's IP address from the request.
        Handles proxy headers (X-Forwarded-For).
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
