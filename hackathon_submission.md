# Maths Agent Tutor - Hackathon Submission Content

## Inspiration
The inspiration for **Maths Agent Tutor** came from the realization that while AI is great at generating text, mathematics is a deeply visual and interactive subject. Most tutoring systems are static or text-heavy. We wanted to create an AI tutor that feels like a human sitting next to you—someone who can speak to you naturally, sketch a graph on the fly, and guide you through a problem step-by-step using the **Socratic method**, without just giving away the answer.

## What it does
**Maths Agent Tutor** is an advanced, voice-first AI tutoring platform that leverages the **Gemini Multimodal Live API** to provide an interactive, low-latency learning experience. It combines high-fidelity audio, real-time transcription, and dynamic mathematical visualizations.
- **Voice-First Interaction**: Natural, bidirectional audio conversation with low latency.
- **Multi-Agentic Architecture**: Orchestrated agents for tutoring, visualization, and problem generation.
- **Dynamic Visuals**: Real-time rendering of 2D/3D graphs, geometry, and equations that evolve with the conversation.
- **Seamless Interruptions**: Natural "barge-in" capability where the AI stops immediately when the user speaks.
- **Context-Aware Feedback**: The AI "sees" what it renders and can reference specific visual elements during its explanation.

## How we built it
We built the application using a modern, decoupled stack focused on real-time performance:
- **Backend**: **Django Channels** handles WebSocket connections and bridges the communication between the frontend and the **Gemini Multimodal Live API**.
- **Frontend**: A **React** application built with **Vite**, using **AudioContext** and **AudioWorklet** for high-performance audio processing.
- **Visuals**: We used **Three.js** for 3D plots, **Plotly.js** and **Recharts** for 2D graphs and charts, and **Framer Motion** for smooth UI transitions.
- **AI Core**: The system uses **Gemini 2.5 Flash** for its speed and multimodal capabilities, employing a multi-agentic strategy to separate tutoring logic from technical visualization data generation.

## Challenges we ran into
One of the biggest challenges was managing the **low-latency audio pipeline** while synchronizing it with complex visual updates. Implementing a robust "barge-in" mechanism required deep integration with the Browser's `AudioWorklet` to ensure that when the user speaks, the AI's audio buffer is cleared instantly across all layers. 
Another challenge was **coordinate mapping**—ensuring the AI understood the spatial relationship of the geometry it was generating so it could "point" to parts of a triangle or circle in its verbal explanation.

## Accomplishments that we're proud of
- **Real-time Synchronicity**: The feeling of the AI drawing a graph precisely as it explains the axes is incredibly satisfying and feels like the future of education.
- **Robust Barge-in**: Achieving natural interruption handling makes the interaction feel like a real conversation rather than a walkie-talkie.
- **Multi-Agent Orchestration**: Successfully decoupling the "tutor persona" from the "math engine" allows for high-quality pedagogical guidance without sacrificing technical accuracy in the visuals.

## What we learned
We learned the critical importance of **latency** in user perception—even a few hundred milliseconds can break the illusion of an intelligent tutor. We also discovered how to leverage **multimodal feedback loops** where the AI uses tool-calling to generate a visual and then receives an acknowledgment that helps it maintain context about what the student is looking at.

## What's next for Maths Agent Tutor
- **3D Simulations**: Physics-based interactive modules (e.g., gravity, pendulums).
- **Collaborative Teaching**: Multi-user rooms where a teacher can oversee several AI-student pairs.
- **Handwriting Recognition**: Allowing students to draw their work on a digital canvas for the AI to analyze and provide feedback on.
- **Curriculum Integration**: Connecting to state and national education standards to provide structured learning paths.
