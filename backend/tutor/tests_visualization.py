import unittest
from unittest.mock import AsyncMock, patch
from django.test import TestCase
from tutor.visualization_agent import generate_visualization

class VisualizationAgentTest(TestCase):

    @patch("tutor.visualization_agent.genai.Client")
    async def test_generate_visualization_success(self, MockClient):
        # Setup mock response
        mock_response = AsyncMock()
        mock_response.text = '{"visual_type": "graph_function", "title": "Test Plot", "functions": []}'
        
        mock_client_instance = MockClient.return_value
        # Ensure generate_content is an AsyncMock
        mock_client_instance.aio.models.generate_content = AsyncMock(return_value=mock_response)

        # Call the agent
        tool_call_args = {
            "visual_type": "graph_function",
            "concept": "test",
            "parameters": {}
        }
        
        result = await generate_visualization(tool_call_args)
        
        # Verify
        self.assertEqual(result["visual_type"], "graph_function")
        self.assertEqual(result["title"], "Test Plot")
        mock_client_instance.aio.models.generate_content.assert_called_once()

    @patch("tutor.visualization_agent.genai.Client")
    async def test_generate_visualization_json_error(self, MockClient):
        # Setup mock response with invalid JSON
        mock_response = AsyncMock()
        mock_response.text = 'Invalid JSON response'
        
        mock_client_instance = MockClient.return_value
        mock_client_instance.aio.models.generate_content = AsyncMock(return_value=mock_response)

        # Call the agent
        tool_call_args = {
            "visual_type": "graph_function",
            "concept": "test",
            "parameters": {}
        }
        
        result = await generate_visualization(tool_call_args)
        
        # Verify fallback - match descriptive error message from code
        self.assertEqual(result["visual_type"], "graph_function")
        self.assertIn("error", result)
        self.assertTrue(result["error"].startswith("Failed to parse visualization JSON"))

if __name__ == "__main__":
    unittest.main()
