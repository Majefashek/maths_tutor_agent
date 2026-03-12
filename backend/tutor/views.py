import json
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .visualization_agent import generate_visualization

def home(request):
    return HttpResponse("Maths Tutor Backend is Running. Use WebSockets at ws://localhost:8000/ws/tutor/session/")

@csrf_exempt
async def debug_visualization_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    
    try:
        data = json.loads(request.body)
        visual_type = data.get("visual_type")
        concept = data.get("concept")
        parameters = data.get("parameters", {})

        if not visual_type or not concept:
            return JsonResponse({"error": "visual_type and concept are required"}, status=400)

        result = await generate_visualization({
            "visual_type": visual_type,
            "concept": concept,
            "parameters": parameters
        })

        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
