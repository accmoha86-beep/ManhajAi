"""
Manhaj AI — Python AI Microservice
Enhanced AI Chat + PDF Processing + Analytics
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import time

from chat_engine import chat_engine
from db_client import db

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FastAPI App
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(
    title="Manhaj AI Python Service",
    description="Enhanced AI Chat, PDF Processing & Analytics for Manhaj AI",
    version="1.0.0"
)

# CORS — allow Next.js to call this service
ALLOWED_ORIGINS = [
    "https://manhaj-ai.com",
    "https://www.manhaj-ai.com",
    "https://manhaj-ai-web-production.up.railway.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Models
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ChatRequest(BaseModel):
    message: str
    user_id: str
    subject_id: str
    stream: bool = False


class ChatResponse(BaseModel):
    success: bool
    response: str
    tokens_used: int = 0
    mode: str = "chat"


class PracticeRequest(BaseModel):
    subject_id: str
    topic: str = ""
    difficulty: str = "medium"
    count: int = 5


class ExplainRequest(BaseModel):
    question: str
    student_answer: str
    correct_answer: str
    subject_id: str


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Health Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway"""
    return {
        "status": "healthy",
        "service": "manhaj-ai-python",
        "version": "1.0.0",
        "timestamp": int(time.time())
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Manhaj AI Python Service",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/chat",
            "/chat/practice",
            "/chat/explain",
        ]
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI Chat Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Enhanced AI Chat — Main endpoint
    
    Features:
    - Smart RAG with curriculum content
    - Student profile awareness
    - Conversation history
    - Adaptive teaching style
    - Egyptian youth personality
    """
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if not request.user_id or not request.subject_id:
            raise HTTPException(status_code=400, detail="user_id and subject_id are required")
        
        # Call enhanced chat engine
        response = await chat_engine.chat(
            message=request.message,
            user_id=request.user_id,
            subject_id=request.subject_id,
            stream=request.stream
        )
        
        return ChatResponse(
            success=True,
            response=response,
            mode="chat"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")
        return ChatResponse(
            success=False,
            response="عفواً، حصل خطأ تقني 😅 جرب تاني كمان شوية.",
            mode="error"
        )


@app.post("/chat/practice")
async def generate_practice(request: PracticeRequest):
    """Generate practice questions for a specific topic"""
    try:
        questions = await chat_engine.generate_practice_questions(
            subject_id=request.subject_id,
            topic=request.topic,
            difficulty=request.difficulty,
            count=request.count
        )
        
        return {
            "success": True,
            "questions": questions
        }
    
    except Exception as e:
        print(f"❌ Practice endpoint error: {e}")
        return {
            "success": False,
            "error": "مقدرتش أعمل الأسئلة دلوقتي"
        }


@app.post("/chat/explain")
async def explain_answer(request: ExplainRequest):
    """Explain why an answer is correct/wrong"""
    try:
        explanation = await chat_engine.explain_answer(
            question=request.question,
            student_answer=request.student_answer,
            correct_answer=request.correct_answer,
            subject_id=request.subject_id
        )
        
        return {
            "success": True,
            "explanation": explanation
        }
    
    except Exception as e:
        print(f"❌ Explain endpoint error: {e}")
        return {
            "success": False,
            "error": "مقدرتش أشرح دلوقتي"
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Error Handler
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler"""
    print(f"❌ Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "حصل خطأ غير متوقع",
            "detail": str(exc)[:200]
        }
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Startup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.on_event("startup")
async def startup():
    """Initialize services on startup"""
    print("🚀 Manhaj AI Python Service starting...")
    print(f"📡 Supabase URL: {db.url}")
    print(f"🔑 Anon key present: {'Yes' if db.anon_key else 'No'}")
    
    # Pre-warm the chat engine
    try:
        api_key = await db.get_secret("anthropic_api_key")
        model = await db.get_secret("AI_MODEL")
        print(f"🤖 AI Model: {model or 'default'}")
        print(f"🔑 API key present: {'Yes' if api_key else 'No'}")
    except Exception as e:
        print(f"⚠️ Startup warning: {e}")
    
    print("✅ Manhaj AI Python Service ready!")
