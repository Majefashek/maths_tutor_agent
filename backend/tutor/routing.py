"""
WebSocket URL routing for the tutor app.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/tutor/session/$", consumers.TutorConsumer.as_asgi()),
]
