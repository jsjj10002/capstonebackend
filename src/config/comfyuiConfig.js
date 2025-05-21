// axios 대신 node의 기본 fetch API 사용
const fs = require('fs');
const path = require('path');

// 워크플로우 커스터마이징 함수
const customizeWorkflow = (workflow, { prompt, imagePath }) => {
  const modifiedWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // 입력 이미지 경로 수정 (프로필 사진)
  if (modifiedWorkflow['46']) {
    modifiedWorkflow['46'].inputs.image = imagePath;
  }
  
  // 프롬프트 텍스트 설정
  if (modifiedWorkflow['54']) {
    modifiedWorkflow['54'].inputs.text = prompt;
  }
  
  if (modifiedWorkflow['56']) {
    modifiedWorkflow['56'].inputs.text = prompt;
  }
  
  // 랜덤 시드 생성
  modifiedWorkflow['50'].inputs.seed = Math.floor(Math.random() * 1000000000000000);
  modifiedWorkflow['58'].inputs.seed = Math.floor(Math.random() * 1000000000000000);
  
  return modifiedWorkflow;
};

// ComfyUI API 호출 함수 - fetch API 사용
const runComfyWorkflow = async (workflow) => {
  try {
    const COMFY_SERVER = process.env.COMFY_SERVER_URL || 'http://127.0.0.1:8188';
    
    // 워크플로우 실행 요청
    const promptResponse = await fetch(`${COMFY_SERVER}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: workflow
      })
    });
    
    const promptData = await promptResponse.json();
    const prompt_id = promptData.prompt_id;
    
    // 이미지 생성 완료 대기 (폴링)
    const maxRetries = 30; // 최대 30초 대기
    let retryCount = 0;
    let imageUrl = null;
    
    while (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      
      const historyResponse = await fetch(`${COMFY_SERVER}/history`);
      const history = await historyResponse.json();
      
      if (history[prompt_id] && history[prompt_id].outputs) {
        const outputs = history[prompt_id].outputs;
        
        // SaveImage 노드 찾기
        for (const nodeId in outputs) {
          if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
            const imageName = outputs[nodeId].images[0].filename;
            imageUrl = `${COMFY_SERVER}/view?filename=${imageName}`;
            break;
          }
        }
        
        if (imageUrl) break;
      }
      
      retryCount++;
    }
    
    if (!imageUrl) {
      return {
        success: false,
        error: '이미지 생성 타임아웃'
      };
    }
    
    // 이미지 다운로드
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageData = Buffer.from(arrayBuffer);
    
    return {
      success: true,
      imageData,
      imageUrl
    };
    
  } catch (error) {
    console.error('ComfyUI API 호출 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  customizeWorkflow,
  runComfyWorkflow
}; 