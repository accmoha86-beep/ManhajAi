"""
Enhanced AI Chat Engine for Manhaj AI
Smart RAG + Student Awareness + Adaptive Teaching
"""

import json
from typing import Optional
from anthropic import AsyncAnthropic
from db_client import db
from prompts import (
    ENHANCED_SYSTEM_PROMPT,
    STUDENT_CONTEXT_TEMPLATE,
    SUBJECT_CONTEXT_TEMPLATE,
    CONVERSATION_SUMMARY_PROMPT,
)


class ChatEngine:
    """Enhanced AI Chat Engine with smart RAG and student awareness"""
    
    def __init__(self):
        self.client: Optional[AsyncAnthropic] = None
        self.model: str = "claude-sonnet-4-20250514"  # Default, overridden by DB
        self._api_key: Optional[str] = None
    
    async def _ensure_client(self):
        """Initialize Anthropic client with API key from DB"""
        if self.client is None:
            api_key = await db.get_secret("anthropic_api_key")
            if not api_key:
                raise Exception("Anthropic API key not found in database")
            self._api_key = api_key
            self.client = AsyncAnthropic(api_key=api_key)
            
            # Get model from DB
            model = await db.get_secret("AI_MODEL")
            if model:
                self.model = model
    
    async def _build_student_context(self, user_id: str) -> str:
        """Build personalized student context"""
        try:
            # Get student profile
            profile = await db.get_student_profile(user_id)
            dashboard = await db.get_student_dashboard(user_id)
            
            # Extract stats
            stats = {}
            if isinstance(dashboard, dict):
                stats = dashboard.get("stats", {})
            elif isinstance(dashboard, list) and len(dashboard) > 0:
                stats = dashboard[0].get("stats", {}) if isinstance(dashboard[0], dict) else {}
            
            student_name = profile.get("full_name", "طالب") if isinstance(profile, dict) else "طالب"
            governorate = profile.get("governorate", "غير محدد") if isinstance(profile, dict) else "غير محدد"
            avg_score = stats.get("avg_score", 0) if isinstance(stats, dict) else 0
            exams_taken = stats.get("total_exams", 0) if isinstance(stats, dict) else 0
            
            # Get exam results for weak/strong analysis
            exam_results = await db.get_exam_results(user_id)
            weak_subjects = []
            strong_subjects = []
            
            if exam_results:
                subject_scores = {}
                for result in exam_results:
                    sid = result.get("subject_id", "")
                    score = result.get("score", 0)
                    if sid not in subject_scores:
                        subject_scores[sid] = []
                    subject_scores[sid].append(score)
                
                for sid, scores in subject_scores.items():
                    avg = sum(scores) / len(scores) if scores else 0
                    if avg < 50:
                        weak_subjects.append(sid[:8])  # abbreviated
                    elif avg > 80:
                        strong_subjects.append(sid[:8])
            
            return STUDENT_CONTEXT_TEMPLATE.format(
                student_name=student_name,
                governorate=governorate,
                avg_score=round(avg_score, 1),
                exams_taken=exams_taken,
                weak_subjects=", ".join(weak_subjects) if weak_subjects else "لسه مفيش بيانات كافية",
                strong_subjects=", ".join(strong_subjects) if strong_subjects else "لسه مفيش بيانات كافية",
                leaderboard_points=stats.get("leaderboard_points", 0) if isinstance(stats, dict) else 0,
                subscription_days=stats.get("subscription_days", "غير محدد") if isinstance(stats, dict) else "غير محدد"
            )
        except Exception as e:
            print(f"⚠️ Failed to build student context: {e}")
            return ""
    
    async def _build_subject_context(self, subject_id: str) -> str:
        """Build subject RAG context with summaries and questions"""
        try:
            # Get subject context (summaries + lessons)
            context = await db.get_subject_context(subject_id)
            
            # Get sample questions
            questions = await db.get_subject_questions(subject_id, limit=15)
            
            # Format context
            subject_name = "غير محدد"
            lessons_list = ""
            summaries_content = ""
            
            if isinstance(context, dict):
                subject_name = context.get("subject_name", "غير محدد")
                lessons = context.get("lessons", [])
                summaries = context.get("summaries", [])
                
                if lessons:
                    lessons_list = "\n".join([
                        f"  {i+1}. {l.get('title_ar', l.get('title', ''))}" 
                        for i, l in enumerate(lessons)
                    ])
                
                if summaries:
                    summaries_content = "\n\n".join([
                        f"--- ملخص: {s.get('lesson_title', '')} ---\n{s.get('content_ar', s.get('content', ''))[:1500]}"
                        for s in summaries[:5]  # Limit to 5 summaries to fit context
                    ])
            elif isinstance(context, list):
                # Handle array response
                for item in context:
                    if isinstance(item, dict):
                        subject_name = item.get("subject_name", subject_name)
                        if "lessons" in item:
                            lessons = item["lessons"]
                            lessons_list = "\n".join([
                                f"  {i+1}. {l.get('title_ar', l.get('title', ''))}"
                                for i, l in enumerate(lessons)
                            ])
                        if "summaries" in item:
                            summaries = item["summaries"]
                            summaries_content = "\n\n".join([
                                f"--- ملخص ---\n{s.get('content_ar', s.get('content', ''))[:1500]}"
                                for s in summaries[:5]
                            ])
            
            # Format sample questions
            sample_questions = ""
            if questions:
                q_list = []
                for i, q in enumerate(questions[:10]):
                    q_text = q.get("question_ar", "")
                    q_type = q.get("question_type", "mcq")
                    difficulty = q.get("difficulty", "medium")
                    options = q.get("options", [])
                    
                    q_str = f"  سؤال {i+1} ({difficulty}): {q_text}"
                    if options and q_type == "mcq":
                        for j, opt in enumerate(options):
                            q_str += f"\n    {'أبجد'[j] if j < 4 else chr(ord('أ')+j)}) {opt}"
                    q_list.append(q_str)
                
                sample_questions = "\n\n".join(q_list)
            
            return SUBJECT_CONTEXT_TEMPLATE.format(
                subject_name=subject_name,
                lessons_list=lessons_list or "لا توجد دروس متاحة",
                summaries_content=summaries_content or "لا توجد ملخصات متاحة",
                sample_questions=sample_questions or "لا توجد أسئلة متاحة"
            )
        except Exception as e:
            print(f"⚠️ Failed to build subject context: {e}")
            return ""
    
    async def _build_conversation_history(self, user_id: str, subject_id: str) -> list:
        """Get and format conversation history with smart truncation"""
        try:
            messages = await db.get_chat_history(user_id, subject_id, limit=20)
            
            if not messages:
                return []
            
            formatted = []
            total_chars = 0
            max_chars = 8000  # Keep conversation history under 8K chars
            
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                # Map roles
                api_role = "user" if role == "user" else "assistant"
                
                # Truncate very long messages
                if len(content) > 1000:
                    content = content[:1000] + "... (تم الاختصار)"
                
                total_chars += len(content)
                if total_chars > max_chars:
                    break
                
                formatted.append({
                    "role": api_role,
                    "content": content
                })
            
            return formatted
        except Exception as e:
            print(f"⚠️ Failed to build conversation history: {e}")
            return []
    
    def _search_relevant_content(self, message: str, summaries_content: str) -> str:
        """Simple keyword-based RAG search within summaries"""
        if not summaries_content or not message:
            return ""
        
        # Extract keywords from message (simple approach)
        # Remove common Arabic stop words
        stop_words = {
            "في", "من", "على", "إلى", "عن", "مع", "هل", "ما", "لا", "أن",
            "هو", "هي", "هم", "أنا", "إنت", "انت", "انتي", "إيه", "ايه",
            "يعني", "كده", "ده", "دي", "دول", "اللي", "بتاع", "عايز",
            "عايزة", "ممكن", "لو", "طب", "يا", "بس", "كمان", "تاني",
            "شوية", "خالص", "أوي", "جدا", "جداً", "لسه", "عشان",
        }
        
        words = message.split()
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
        if not keywords:
            return ""
        
        # Search for relevant sections in summaries
        sections = summaries_content.split("---")
        relevant = []
        
        for section in sections:
            score = sum(1 for kw in keywords if kw in section)
            if score > 0:
                relevant.append((score, section.strip()))
        
        # Sort by relevance and take top 3
        relevant.sort(key=lambda x: x[0], reverse=True)
        top_relevant = [text for _, text in relevant[:3]]
        
        if top_relevant:
            return "\n\n🔍 محتوى ذو صلة بسؤال الطالب:\n" + "\n---\n".join(top_relevant)
        
        return ""
    
    async def chat(
        self,
        message: str,
        user_id: str,
        subject_id: str,
        stream: bool = False
    ) -> str:
        """
        Process a chat message with enhanced AI
        
        1. Build student context (personalization)
        2. Build subject context (RAG)
        3. Get conversation history
        4. Search relevant content
        5. Call Claude with everything
        """
        await self._ensure_client()
        
        # Build all contexts in parallel-ish fashion
        student_context = await self._build_student_context(user_id)
        subject_context = await self._build_subject_context(subject_id)
        conversation_history = await self._build_conversation_history(user_id, subject_id)
        
        # Smart RAG: search for relevant content based on message
        relevant_content = self._search_relevant_content(message, subject_context)
        
        # Build the full system prompt
        system_prompt = ENHANCED_SYSTEM_PROMPT
        
        if student_context:
            system_prompt += "\n\n" + student_context
        
        if subject_context:
            system_prompt += "\n\n" + subject_context
        
        if relevant_content:
            system_prompt += "\n\n" + relevant_content
        
        # Build messages array
        messages = []
        
        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        # Ensure messages alternate correctly
        messages = self._fix_message_order(messages)
        
        try:
            # Call Claude
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
                temperature=0.7,  # Slightly creative for engaging responses
            )
            
            assistant_message = response.content[0].text
            
            # Save both messages to DB
            await db.save_chat_message(user_id, subject_id, "user", message)
            await db.save_chat_message(user_id, subject_id, "assistant", assistant_message)
            
            return assistant_message
            
        except Exception as e:
            error_msg = f"عفواً، حصل خطأ تقني 😅 جرب تاني كمان شوية. (Error: {str(e)[:100]})"
            print(f"❌ Chat error: {e}")
            return error_msg
    
    def _fix_message_order(self, messages: list) -> list:
        """Ensure messages alternate between user and assistant"""
        if not messages:
            return []
        
        fixed = []
        last_role = None
        
        for msg in messages:
            role = msg["role"]
            
            # Skip consecutive same-role messages (keep latest)
            if role == last_role:
                if role == "user":
                    # Merge user messages
                    fixed[-1]["content"] += "\n" + msg["content"]
                    continue
                else:
                    # Replace assistant message with newer one
                    fixed[-1] = msg
                    continue
            
            fixed.append(msg)
            last_role = role
        
        # Ensure first message is from user
        if fixed and fixed[0]["role"] != "user":
            fixed = fixed[1:]
        
        # Ensure last message is from user
        if fixed and fixed[-1]["role"] != "user":
            fixed = fixed[:-1]
        
        return fixed if fixed else [{"role": "user", "content": "مرحبا"}]
    
    async def generate_practice_questions(
        self,
        subject_id: str,
        topic: str = "",
        difficulty: str = "medium",
        count: int = 5
    ) -> str:
        """Generate practice questions on a specific topic"""
        await self._ensure_client()
        
        subject_context = await self._build_subject_context(subject_id)
        
        prompt = f"""بناءً على المنهج التالي، اعمل {count} أسئلة تدريبية 
{'عن موضوع: ' + topic if topic else ''}
مستوى الصعوبة: {difficulty}

{subject_context[:3000]}

اعمل الأسئلة بصيغة واضحة مع الإجابات. رقّم الأسئلة ووضّح الإجابة الصح مع الشرح."""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=ENHANCED_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
            )
            return response.content[0].text
        except Exception as e:
            return f"عفواً، مقدرتش أعمل الأسئلة دلوقتي. جرب تاني."
    
    async def explain_answer(
        self,
        question: str,
        student_answer: str,
        correct_answer: str,
        subject_id: str
    ) -> str:
        """Explain why an answer is correct/wrong"""
        await self._ensure_client()
        
        prompt = f"""الطالب جاوب على السؤال ده:

السؤال: {question}
إجابة الطالب: {student_answer}
الإجابة الصحيحة: {correct_answer}

{'✅ إجابة صح!' if student_answer == correct_answer else '❌ إجابة غلط'}

اشرح ليه الإجابة الصحيحة هي "{correct_answer}":
- اشرح المفهوم
- وضّح ليه الاختيارات التانية غلط
- اربط بالمنهج
- اعطي نصيحة عشان ميغلطش تاني"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=ENHANCED_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
            )
            return response.content[0].text
        except Exception as e:
            return f"عفواً، مقدرتش أشرح دلوقتي."


# Singleton
chat_engine = ChatEngine()
