"""
Supabase Database Client
Connects to same Supabase instance using REST API + RPC functions
"""

import httpx
import os
from typing import Optional, Any


class SupabaseClient:
    """Client for Supabase using REST API and RPC functions"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "https://zsoqqoyodhxoptxrdnpk.supabase.co")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY", "")
        self.headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def rpc(self, function_name: str, params: dict = None) -> Any:
        """Call a Supabase RPC function"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.url}/rest/v1/rpc/{function_name}",
                headers=self.headers,
                json=params or {}
            )
            if response.status_code >= 400:
                raise Exception(f"RPC {function_name} failed: {response.status_code} - {response.text}")
            return response.json()
    
    async def get_secret(self, key: str) -> Optional[str]:
        """Get a system secret from DB"""
        try:
            result = await self.rpc("get_system_secret", {"p_key": key})
            return result if isinstance(result, str) else None
        except Exception as e:
            print(f"⚠️ Failed to get secret {key}: {e}")
            return None
    
    async def get_subject_context(self, subject_id: str) -> dict:
        """Get subject content for RAG (summaries + lessons + questions)"""
        try:
            result = await self.rpc("get_subject_context", {"p_subject_id": subject_id})
            return result if result else {}
        except Exception as e:
            print(f"⚠️ Failed to get subject context: {e}")
            return {}
    
    async def get_student_profile(self, user_id: str) -> dict:
        """Get student info for personalized chat"""
        try:
            result = await self.rpc("get_auth_user", {"p_user_id": user_id})
            return result if result else {}
        except Exception as e:
            print(f"⚠️ Failed to get student profile: {e}")
            return {}
    
    async def get_student_performance(self, user_id: str) -> dict:
        """Get student exam performance for adaptive responses"""
        try:
            result = await self.rpc("get_student_performance", {"p_user_id": user_id})
            return result if result else {}
        except Exception as e:
            print(f"⚠️ Failed to get performance: {e}")
            return {}
    
    async def get_student_dashboard(self, user_id: str) -> dict:
        """Get student dashboard data"""
        try:
            result = await self.rpc("get_student_dashboard", {"p_user_id": user_id})
            return result if result else {}
        except Exception as e:
            print(f"⚠️ Failed to get dashboard: {e}")
            return {}
    
    async def get_chat_history(self, user_id: str, subject_id: str, limit: int = 20) -> list:
        """Get recent chat messages for context"""
        try:
            # Query chat_messages table via REST
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.url}/rest/v1/chat_messages",
                    headers=self.headers,
                    params={
                        "user_id": f"eq.{user_id}",
                        "subject_id": f"eq.{subject_id}",
                        "order": "created_at.desc",
                        "limit": str(limit),
                        "select": "role,content,created_at"
                    }
                )
                if response.status_code < 400:
                    messages = response.json()
                    messages.reverse()  # Oldest first
                    return messages
                return []
        except Exception as e:
            print(f"⚠️ Failed to get chat history: {e}")
            return []
    
    async def save_chat_message(self, user_id: str, subject_id: str, role: str, content: str) -> bool:
        """Save a chat message"""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.url}/rest/v1/chat_messages",
                    headers=self.headers,
                    json={
                        "user_id": user_id,
                        "subject_id": subject_id,
                        "role": role,
                        "content": content
                    }
                )
                return response.status_code < 400
        except Exception as e:
            print(f"⚠️ Failed to save message: {e}")
            return False
    
    async def get_exam_results(self, user_id: str, subject_id: str = None) -> list:
        """Get student's exam results for adaptive teaching"""
        try:
            params = {
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": "10",
                "select": "subject_id,score,total_questions,created_at"
            }
            if subject_id:
                params["subject_id"] = f"eq.{subject_id}"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.url}/rest/v1/exam_results",
                    headers=self.headers,
                    params=params
                )
                if response.status_code < 400:
                    return response.json()
                return []
        except Exception as e:
            print(f"⚠️ Failed to get exam results: {e}")
            return []
    
    async def get_subject_questions(self, subject_id: str, limit: int = 10) -> list:
        """Get sample questions for the subject"""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.url}/rest/v1/questions",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "limit": str(limit),
                        "select": "question_ar,options,correct_answer,difficulty,question_type"
                    }
                )
                if response.status_code < 400:
                    return response.json()
                return []
        except Exception as e:
            print(f"⚠️ Failed to get questions: {e}")
            return []


# Singleton instance
db = SupabaseClient()
