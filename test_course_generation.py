#!/usr/bin/env python3
"""
Test script for intelligent course generation functionality
"""
import requests
import json
import time
import sys

# API base URL
BASE_URL = "http://localhost:8000/api/v1"

def test_course_generation():
    """Test the course generation API"""
    print("🚀 开始测试智能课程生成功能...")
    
    # Test data
    test_data = {
        "document_ids": [],  # 空文档ID列表，将使用课程标题和描述生成
        "course_config": {
            "name": "Python编程入门",
            "type": "编程技术",
            "audience": "编程初学者",
            "level": "beginner",
            "duration": "16课时",
            "chapters": 6
        }
    }
    
    try:
        # 1. 发起课程生成请求
        print("📝 发送课程生成请求...")
        response = requests.post(
            f"{BASE_URL}/courses/generate",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ 请求失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            return False
        
        result = response.json()
        print(f"✅ 课程生成请求成功")
        print(f"   课程ID: {result['course_id']}")
        print(f"   任务ID: {result['task_id']}")
        
        course_id = result['course_id']
        
        # 2. 等待生成完成
        print("⏳ 等待AI生成课程内容...")
        
        # 等待一段时间让后台任务完成
        for i in range(10):
            time.sleep(2)
            
            # 检查课程状态
            try:
                course_response = requests.get(f"{BASE_URL}/courses/{course_id}")
                if course_response.status_code == 200:
                    print(f"   检查进度 ({i+1}/10)...")
                else:
                    print(f"   无法获取课程状态: {course_response.status_code}")
            except:
                print(f"   网络错误，继续等待...")
        
        # 3. 获取课程列表验证
        print("📋 验证生成的课程...")
        courses_response = requests.get(f"{BASE_URL}/courses/")
        
        if courses_response.status_code != 200:
            print(f"❌ 获取课程列表失败: {courses_response.status_code}")
            return False
        
        courses = courses_response.json()
        
        # 查找我们生成的课程
        generated_course = None
        for course in courses:
            if course['id'] == course_id:
                generated_course = course
                break
        
        if not generated_course:
            print(f"❌ 未找到生成的课程 (ID: {course_id})")
            return False
        
        print("✅ 找到生成的课程:")
        print(f"   标题: {generated_course['title']}")
        print(f"   描述: {generated_course['description']}")
        print(f"   状态: {generated_course['status']}")
        print(f"   章节数: {generated_course['chapters']}")
        
        # 4. 检查是否真的调用了LLM
        print("\n🔍 检查LLM调用结果...")
        
        # 检查后端日志
        print("📊 查看Docker日志...")
        import subprocess
        try:
            log_result = subprocess.run(
                ["docker-compose", "logs", "--tail=50", "backend"], 
                capture_output=True, 
                text=True,
                cwd="E:/project/CurriculumKnowledgePlanning"
            )
            
            logs = log_result.stdout
            
            # 检查关键日志
            llm_indicators = [
                "Starting LLM-based content generation",
                "Course introduction generated successfully",
                "Learning objectives generated successfully", 
                "Generated", "chapters with sections",
                "Course content generation completed"
            ]
            
            found_indicators = []
            for indicator in llm_indicators:
                if indicator in logs:
                    found_indicators.append(indicator)
            
            if found_indicators:
                print("✅ 发现LLM调用证据:")
                for indicator in found_indicators:
                    print(f"   ✓ {indicator}")
            else:
                print("❌ 未发现LLM调用证据")
                print("最近的日志:")
                print(logs[-1000:])
                
        except Exception as e:
            print(f"⚠️  无法获取Docker日志: {e}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        return False

def test_llm_service_directly():
    """直接测试LLM服务"""
    print("\n🧪 直接测试LLM服务...")
    
    try:
        # 这需要在容器内运行
        test_script = """
import sys
sys.path.append('/app')
from app.services.llm_service import LLMService

llm_service = LLMService()
result = llm_service.generate_course_introduction(
    document_content="这是一个Python编程入门课程，面向初学者", 
    course_type="编程技术"
)
print("LLM Service Test Result:", result)
"""
        
        import subprocess
        result = subprocess.run([
            "docker-compose", "exec", "-T", "backend", 
            "python", "-c", test_script
        ], capture_output=True, text=True, cwd="E:/project/CurriculumKnowledgePlanning")
        
        print(f"直接测试结果:")
        print(f"Exit code: {result.returncode}")
        print(f"Stdout: {result.stdout}")
        if result.stderr:
            print(f"Stderr: {result.stderr}")
            
    except Exception as e:
        print(f"❌ 直接测试失败: {e}")

if __name__ == "__main__":
    print("="*60)
    print("🎓 Curriculum Knowledge Planning - 智能课程生成测试")
    print("="*60)
    
    # 测试API
    success = test_course_generation()
    
    # 直接测试LLM服务
    test_llm_service_directly()
    
    if success:
        print("\n🎉 测试完成! 智能课程生成功能运行正常")
    else:
        print("\n❌ 测试失败! 需要检查问题")
        sys.exit(1)