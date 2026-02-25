import json
import time
from openai import OpenAI
from config import API_KEY, API_BASE_URL, MODEL, TEMPERATURE, REQUEST_INTERVAL
from prompts import SYSTEM_PROMPT, ANALYZE_NOTE_PROMPT

class LipstickAnalyzer:
    def __init__(self):
        self.client = OpenAI(api_key=API_KEY, base_url=API_BASE_URL)

    def analyze_note(self, note_data):
        """分析单条笔记"""
        prompt = ANALYZE_NOTE_PROMPT.format(
            title=note_data['title'],
            desc=note_data['desc'],
            tags=note_data['tag_list']
        )

        try:
            response = self.client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=TEMPERATURE
            )

            result_text = response.choices[0].message.content.strip()

            # 去掉可能的 markdown 代码块标记
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            return json.loads(result_text)

        except Exception as e:
            print(f"  ❌ 分析失败: {e}")
            return None

    def analyze_batch(self, notes):
        """批量分析笔记"""
        results = []

        for i, note in enumerate(notes):
            print(f"\n[{i+1}/{len(notes)}] 分析: {note['title'][:30]}...")

            analysis = self.analyze_note(note)

            if analysis:
                results.append({
                    "note_id": note['note_id'],
                    "title": note['title'],
                    "source_keyword": note['source_keyword'],
                    "liked_count": note['liked_count'],
                    "analysis": analysis
                })
                print(f"  ✅ 妆容风格: {analysis.get('makeup_style', [])}")
                print(f"  ✅ 口红色调: {analysis['lipstick_features'].get('color', '未知')}")

            time.sleep(REQUEST_INTERVAL)

        return results
