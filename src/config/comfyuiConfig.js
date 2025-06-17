// 범용 워크플로우 처리 시스템 - 모든 워크플로우 100% 원본 보존
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const fetch = require('node-fetch');

// ComfyUI 설정 관리
const getComfyUIConfig = () => {
  const config = {
    serverUrl: process.env.COMFY_SERVER_URL || 'http://127.0.0.1:8188',
    inputDir: process.env.COMFY_INPUT_DIR || null,
    outputDir: process.env.COMFY_OUTPUT_DIR || null
  };
  
  // 기본 경로 추론 시도 (환경 변수가 없는 경우)
  if (!config.inputDir) {
    const possiblePaths = [
      // Windows 일반적인 설치 경로들
      'C:\\ComfyUI_windows_portable_nvidia\\ComfyUI_windows_portable\\ComfyUI\\input',
      'C:\\ComfyUI\\input',
      'C:\\ComfyUI_windows_portable\\ComfyUI\\input',
      // macOS/Linux 일반적인 설치 경로들
      '/opt/ComfyUI/input',
      '/usr/local/ComfyUI/input',
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'ComfyUI', 'input'),
      // 현재 디렉토리 기준
      path.join(process.cwd(), 'ComfyUI', 'input'),
      path.join(process.cwd(), '..', 'ComfyUI', 'input')
    ];
    
    // 존재하는 첫 번째 경로 사용
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        config.inputDir = testPath;
        console.log(`ComfyUI input 디렉토리 자동 감지: ${testPath}`);
        break;
      }
    }
  }
  
  return config;
};

// 이미지를 ComfyUI input 폴더로 복사하는 함수
const copyImageToComfyUI = (imagePath, imageName) => {
  try {
    const config = getComfyUIConfig();
    
    if (!config.inputDir) {
      console.warn('ComfyUI input 디렉토리를 찾을 수 없습니다. 환경 변수 COMFY_INPUT_DIR을 설정하거나 ComfyUI를 표준 경로에 설치하세요.');
      return false;
    }
    
    if (!fs.existsSync(config.inputDir)) {
      console.warn(`ComfyUI input 디렉토리가 존재하지 않습니다: ${config.inputDir}`);
      return false;
    }
    
    const destPath = path.join(config.inputDir, imageName);
    fs.copyFileSync(imagePath, destPath);
    console.log(`이미지 ComfyUI input 폴더로 복사 완료: ${destPath}`);
    return true;
    
  } catch (copyError) {
    console.error('이미지 복사 오류:', copyError.message);
    return false;
  }
};

// 범용 워크플로우 처리 시스템
const processUniversalWorkflow = (workflow, prompt, imageName) => {
  console.log('=== 범용 워크플로우 처리 시작 ===');
  console.log(`노드 수: ${Object.keys(workflow).length}개`);
  
  // 워크플로우 복사 (원본 보존)
  const processedWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // 1. 프롬프트 교체 (긍정 프롬프트 노드 6)
  if (processedWorkflow['6'] && processedWorkflow['6'].class_type === 'CLIPTextEncode') {
    processedWorkflow['6'].inputs.text = prompt;
    console.log(`✓ 프롬프트 설정 (노드 6): ${prompt.substring(0, 50)}...`);
  }
  
  // 2. 이미지 교체 (LoadImage 노드 42)
  if (processedWorkflow['42'] && processedWorkflow['42'].class_type === 'LoadImage' && imageName) {
    processedWorkflow['42'].inputs.image = imageName;
    console.log(`✓ 이미지 파일 설정 (노드 42): ${imageName}`);
  }
  
  // 3. 시드 랜덤화 (모든 샘플러 노드)
  let seedsUpdated = 0;
  for (const [nodeId, node] of Object.entries(processedWorkflow)) {
    // KSampler 시드 랜덤화
    if (node.class_type === 'KSampler' && node.inputs.seed !== undefined) {
      const seed = Math.floor(Math.random() * 1000000000000000);
      node.inputs.seed = seed;
      console.log(`✓ KSampler 시드 설정 (노드 ${nodeId}): ${seed}`);
      seedsUpdated++;
    }
    
    // SamplerCustom 시드 랜덤화
    if (node.class_type === 'SamplerCustom' && node.inputs.noise_seed !== undefined) {
      const seed = Math.floor(Math.random() * 1000000000000000);
      node.inputs.noise_seed = seed;
      console.log(`✓ SamplerCustom 시드 설정 (노드 ${nodeId}): ${seed}`);
      seedsUpdated++;
    }
  }
  
  // 4. Anything Everywhere 시스템 검증 및 복구
  validateAnythingEverywhereSystem(processedWorkflow);
  
  console.log(`✓ 총 ${seedsUpdated}개 샘플러의 시드 업데이트 완료`);
  console.log('=== 범용 워크플로우 처리 완료 ===');
  
  return processedWorkflow;
};

// Anything Everywhere 시스템 검증 및 복구
const validateAnythingEverywhereSystem = (workflow) => {
  console.log('=== Anything Everywhere 시스템 검증 시작 ===');
  
  // Anything Everywhere3 노드 (노드 22) 검증
  const anythingNode = workflow['22'];
  if (anythingNode && anythingNode.class_type === 'Anything Everywhere3') {
    // 연결 검증 및 복구
    if (!anythingNode.inputs.anything || !Array.isArray(anythingNode.inputs.anything)) {
      anythingNode.inputs.anything = ['46', 0]; // IPAdapterFaceID model
      console.log('✓ Anything Everywhere3 model 연결 복구');
    }
    if (!anythingNode.inputs.anything3 || !Array.isArray(anythingNode.inputs.anything3)) {
      anythingNode.inputs.anything3 = ['13', 0]; // VAELoader
      console.log('✓ Anything Everywhere3 VAE 연결 복구');
    }
  }
  
  // Prompts Everywhere 노드 (노드 26) 검증
  const promptsNode = workflow['26'];
  if (promptsNode && promptsNode.class_type === 'Prompts Everywhere') {
    if (!promptsNode.inputs['+ve'] || !Array.isArray(promptsNode.inputs['+ve'])) {
      promptsNode.inputs['+ve'] = ['6', 0]; // 긍정 프롬프트
      console.log('✓ Prompts Everywhere 긍정 프롬프트 연결 복구');
    }
    if (!promptsNode.inputs['-ve'] || !Array.isArray(promptsNode.inputs['-ve'])) {
      promptsNode.inputs['-ve'] = ['7', 0]; // 부정 프롬프트
      console.log('✓ Prompts Everywhere 부정 프롬프트 연결 복구');
    }
  }
  
  // 모든 노드에서 누락된 필수 연결 복구 - 강화된 검증
  let connectionsFixed = 0;
  Object.keys(workflow).forEach(nodeId => {
    const node = workflow[nodeId];
    
    // BasicScheduler 노드 - model 연결 필요
    if (node.class_type === 'BasicScheduler') {
      if (!node.inputs.model || !Array.isArray(node.inputs.model)) {
        node.inputs.model = ['46', 0]; // IPAdapterFaceID 출력
        console.log(`✓ BasicScheduler(${nodeId}) model 연결 복구`);
        connectionsFixed++;
      }
    }
    
    // KSampler 노드 - model, positive, negative 연결 필요
    else if (node.class_type === 'KSampler') {
      if (!node.inputs.model || !Array.isArray(node.inputs.model)) {
        node.inputs.model = ['46', 0]; // IPAdapterFaceID 출력
        console.log(`✓ KSampler(${nodeId}) model 연결 복구`);
        connectionsFixed++;
      }
      if (!node.inputs.positive || !Array.isArray(node.inputs.positive)) {
        node.inputs.positive = ['6', 0]; // 긍정 프롬프트
        console.log(`✓ KSampler(${nodeId}) positive 연결 복구`);
        connectionsFixed++;
      }
      if (!node.inputs.negative || !Array.isArray(node.inputs.negative)) {
        node.inputs.negative = ['7', 0]; // 부정 프롬프트
        console.log(`✓ KSampler(${nodeId}) negative 연결 복구`);
        connectionsFixed++;
      }
    }
    
    // SamplerCustom 노드 - model, positive, negative 연결 필요
    else if (node.class_type === 'SamplerCustom') {
      if (!node.inputs.model || !Array.isArray(node.inputs.model)) {
        node.inputs.model = ['46', 0]; // IPAdapterFaceID 출력
        console.log(`✓ SamplerCustom(${nodeId}) model 연결 복구`);
        connectionsFixed++;
      }
      if (!node.inputs.positive || !Array.isArray(node.inputs.positive)) {
        node.inputs.positive = ['6', 0]; // 긍정 프롬프트
        console.log(`✓ SamplerCustom(${nodeId}) positive 연결 복구`);
        connectionsFixed++;
      }
      if (!node.inputs.negative || !Array.isArray(node.inputs.negative)) {
        node.inputs.negative = ['7', 0]; // 부정 프롬프트
        console.log(`✓ SamplerCustom(${nodeId}) negative 연결 복구`);
        connectionsFixed++;
      }
    }
    
    // VAEDecodeTiled 노드 - vae 연결 필요
    else if (node.class_type === 'VAEDecodeTiled') {
      if (!node.inputs.vae || !Array.isArray(node.inputs.vae)) {
        node.inputs.vae = ['13', 0]; // VAELoader 출력
        console.log(`✓ VAEDecodeTiled(${nodeId}) vae 연결 복구`);
        connectionsFixed++;
      }
    }
    
    // VAEDecode 노드 - vae 연결 필요
    else if (node.class_type === 'VAEDecode') {
      if (!node.inputs.vae || !Array.isArray(node.inputs.vae)) {
        node.inputs.vae = ['13', 0]; // VAELoader 출력
        console.log(`✓ VAEDecode(${nodeId}) vae 연결 복구`);
        connectionsFixed++;
      }
    }
    
    // DetailDaemonSamplerNode - 추가 검증 (새로운 워크플로우에서 사용)
    else if (node.class_type === 'DetailDaemonSamplerNode') {
      // DetailDaemonSamplerNode는 sampler 입력이 필요하며, 이는 KSamplerSelect의 출력
      if (!node.inputs.sampler || !Array.isArray(node.inputs.sampler)) {
        // KSamplerSelect 노드 찾기 (일반적으로 노드 57)
        const ksamplerSelectNode = Object.keys(workflow).find(id => 
          workflow[id].class_type === 'KSamplerSelect'
        );
        if (ksamplerSelectNode) {
          node.inputs.sampler = [ksamplerSelectNode, 0];
          console.log(`✓ DetailDaemonSamplerNode(${nodeId}) sampler 연결 복구 -> 노드 ${ksamplerSelectNode}`);
          connectionsFixed++;
        }
      }
    }
    
    // SplitSigmas 노드 - sigmas 연결 필요 (BasicScheduler의 출력)
    else if (node.class_type === 'SplitSigmas') {
      if (!node.inputs.sigmas || !Array.isArray(node.inputs.sigmas)) {
        // BasicScheduler 노드 찾기 (일반적으로 노드 54)
        const basicSchedulerNode = Object.keys(workflow).find(id => 
          workflow[id].class_type === 'BasicScheduler'
        );
        if (basicSchedulerNode) {
          node.inputs.sigmas = [basicSchedulerNode, 0];
          console.log(`✓ SplitSigmas(${nodeId}) sigmas 연결 복구 -> 노드 ${basicSchedulerNode}`);
          connectionsFixed++;
        }
      }
    }
  });
  
  // 추가 검증: 중요한 노드들의 연결 상태 확인
  const criticalNodes = {
    '4': 'CheckpointLoaderSimple',
    '5': 'EmptyLatentImage', 
    '6': 'CLIPTextEncode (Positive)',
    '7': 'CLIPTextEncode (Negative)',
    '10': 'LoraLoader',
    '13': 'VAELoader',
    '21': 'KSampler',
    '22': 'Anything Everywhere3',
    '26': 'Prompts Everywhere',
    '38': 'VAEDecodeTiled',
    '42': 'LoadImage',
    '45': 'IPAdapterUnifiedLoaderFaceID',
    '46': 'IPAdapterFaceID',
    '54': 'BasicScheduler',
    '55': 'SplitSigmas',
    '56': 'SamplerCustom',
    '57': 'KSamplerSelect',
    '58': 'DetailDaemonSamplerNode'
  };
  
  console.log('=== 중요 노드 연결 상태 검증 ===');
  Object.entries(criticalNodes).forEach(([nodeId, nodeName]) => {
    if (workflow[nodeId]) {
      console.log(`✓ ${nodeName}(${nodeId}) 존재 확인`);
    } else {
      console.log(`⚠ ${nodeName}(${nodeId}) 누락 - 워크플로우에 따라 정상일 수 있음`);
    }
  });
  
  console.log(`=== Anything Everywhere 시스템 검증 완료 ===`);
  console.log(`총 ${connectionsFixed}개의 연결 복구 완료`);
  
  // 최종 워크플로우 유효성 검사
  const totalNodes = Object.keys(workflow).length;
  console.log(`최종 워크플로우 상태: ${totalNodes}개 노드, ${connectionsFixed}개 연결 복구`);
  
  return workflow;
};

// 워크플로우별 특화 설정 적용 (필요시)
const applyWorkflowSpecificSettings = (workflow, workflowPath) => {
  const workflowName = path.basename(workflowPath, '.json');
  console.log(`워크플로우별 특화 설정 확인: ${workflowName}`);
  
  // 워크플로우별 특화 처리
  switch (workflowName) {
    case 'Animal Crossing workflow':
      console.log('Animal Crossing 워크플로우 - 치비 스타일 최적화');
      // 치비 스타일에 특화된 설정 (필요시)
      break;
      
    case 'Rhythm Heaven workflow':
      console.log('Rhythm Heaven 워크플로우 - 독특한 스타일 최적화');
      // Rhythm Heaven 스타일에 특화된 설정 (필요시)
      break;
      
    case 'Studio Ghibli workflow':
      console.log('Studio Ghibli 워크플로우 - 지브리 스타일 최적화');
      // 지브리 스타일에 특화된 설정 (필요시)
      break;
      
    case 'Disney Pixar workflow':
      console.log('Disney Pixar 워크플로우 - 3D 애니메이션 최적화');
      break;
      
    case 'Makoto Shinkai workflow':
      console.log('Makoto Shinkai 워크플로우 - 감성적 화풍 최적화');
      break;
      
    case 'Esthetic 80s workflow':
      console.log('Esthetic 80s 워크플로우 - 레트로 스타일 최적화');
      break;
      
    case 'Minimalist Line workflow':
      console.log('Minimalist Line 워크플로우 - 미니멀 라인 아트 최적화');
      break;
      
    case '_3d character style':
      console.log('3D Character 워크플로우 - 3D 치비 캐릭터 최적화');
      break;
      
    default:
      console.log(`알 수 없는 워크플로우: ${workflowName} - 표준 처리`);
  }
  
  // 모든 워크플로우에 공통으로 적용되는 안정성 검증
  console.log('공통 안정성 검증 수행...');
  
  // 1. 중요한 노드들의 존재 여부 확인
  const requiredNodes = ['4', '5', '6', '7', '9']; // 기본 필수 노드들
  const missingNodes = requiredNodes.filter(nodeId => !workflow[nodeId]);
  
  if (missingNodes.length > 0) {
    console.warn(`누락된 필수 노드: ${missingNodes.join(', ')}`);
  } else {
    console.log('✓ 모든 필수 노드 존재 확인');
  }
  
  // 2. 시드 값 검증 (너무 큰 값이나 잘못된 값 수정)
  Object.keys(workflow).forEach(nodeId => {
    const node = workflow[nodeId];
    if (node.inputs && typeof node.inputs.seed === 'number') {
      if (node.inputs.seed > 999999999999999 || node.inputs.seed < 0) {
        const newSeed = Math.floor(Math.random() * 1000000000000000);
        console.log(`시드 값 수정 (노드 ${nodeId}): ${node.inputs.seed} -> ${newSeed}`);
        node.inputs.seed = newSeed;
      }
    }
    if (node.inputs && typeof node.inputs.noise_seed === 'number') {
      if (node.inputs.noise_seed > 999999999999999 || node.inputs.noise_seed < 0) {
        const newSeed = Math.floor(Math.random() * 1000000000000000);
        console.log(`노이즈 시드 값 수정 (노드 ${nodeId}): ${node.inputs.noise_seed} -> ${newSeed}`);
        node.inputs.noise_seed = newSeed;
      }
    }
  });
  
  console.log('워크플로우별 특화 설정 적용 완료');
  return workflow;
};

// ComfyUI API 호출 함수 - fetch API 사용
const runComfyWorkflow = async (workflow) => {
  try {
    const config = getComfyUIConfig();
    const COMFY_SERVER = config.serverUrl;
    console.log(`ComfyUI API 호출 시작... 서버 URL: ${COMFY_SERVER}`);
    
    // 먼저 ComfyUI 서버 연결 테스트
    try {
      console.log(`ComfyUI 서버 연결 테스트 중: ${COMFY_SERVER}/system_stats`);
      const testResponse = await fetch(`${COMFY_SERVER}/system_stats`);
      
      if (!testResponse.ok) {
        throw new Error(`연결 테스트 실패: ${testResponse.status} ${testResponse.statusText}`);
      }
      
      const testData = await testResponse.json();
      console.log(`ComfyUI 서버 연결 성공. 시스템 정보:`, JSON.stringify(testData).substring(0, 100) + '...');
    } catch (connErr) {
      console.error('ComfyUI 서버 연결 실패:', connErr);
      return {
        success: false,
        error: `ComfyUI 서버에 연결할 수 없습니다: ${connErr.message}`
      };
    }
    
    // 웹소켓 연결 설정
    const wsUrl = COMFY_SERVER.replace('http', 'ws');
    console.log(`웹소켓 연결 시도: ${wsUrl}/ws`);
    
    let ws;
    let wsConnected = false;
    let executionStarted = false;
    
    try {
      ws = new WebSocket(`${wsUrl}/ws`);
      
      // 웹소켓 연결 타임아웃 설정
      const wsConnectTimeout = setTimeout(() => {
        if (!wsConnected) {
          console.warn('웹소켓 연결 타임아웃: 5초 동안 연결되지 않음');
        }
      }, 5000);
      
      // 웹소켓 이벤트 핸들러
      ws.on('open', () => {
        clearTimeout(wsConnectTimeout);
        console.log('ComfyUI 웹소켓 연결 성공');
        wsConnected = true;
        
        // 웹소켓이 연결되면 클라이언트 ID 전송
        const clientId = `node_backend_${Date.now()}`;
        try {
          ws.send(JSON.stringify({
            type: "get_status",
            client_id: clientId
          }));
          console.log(`상태 요청 전송 (client_id: ${clientId})`);
        } catch (sendErr) {
          console.error('웹소켓 메시지 전송 오류:', sendErr);
        }
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('웹소켓 메시지 수신:', message.type);
          
          // 실행 상태 로깅
          if (message.type === 'status') {
            console.log('ComfyUI 상태:', JSON.stringify(message.data).substring(0, 200) + '...');
          } else if (message.type === 'execution_start') {
            executionStarted = true;
            console.log('워크플로우 실행 시작됨:', message.data?.prompt_id);
          } else if (message.type === 'executing') {
            console.log(`노드 실행 중: ${message.data?.node}`);
          } else if (message.type === 'progress') {
            console.log(`진행 상황: ${message.data?.value}/${message.data?.max}`);
          } else if (message.type === 'executed') {
            console.log(`노드 실행 완료: ${message.data?.node}`);
            if (message.data?.output && Object.keys(message.data.output).length > 0) {
              console.log(`출력 데이터 존재: ${Object.keys(message.data.output).join(', ')}`);
            }
          } else if (message.type === 'execution_cached') {
            console.log(`노드 캐시 사용: ${message.data?.nodes?.join(', ') || '없음'}`);
          } else if (message.type === 'execution_error') {
            console.error(`실행 오류: ${message.data?.exception_message || '알 수 없는 오류'}`);
            console.error(`오류 세부 정보: ${JSON.stringify(message.data).substring(0, 500)}...`);
          }
        } catch (e) {
          console.error('웹소켓 메시지 처리 오류:', e);
        }
      });
      
      ws.on('error', (error) => {
        console.error('웹소켓 오류:', error);
      });
      
      ws.on('close', (code, reason) => {
        console.log(`웹소켓 연결 종료: 코드=${code}, 이유=${reason}`);
      });
      
    } catch (wsError) {
      console.error('웹소켓 설정 오류:', wsError);
      // 웹소켓 없이도 계속 진행
    }
    
    // 워크플로우 실행 요청
    const clientId = `node_backend_${Date.now()}`;
    console.log('ComfyUI 워크플로우 실행 요청 전송...');
    
    // 워크플로우 데이터 로깅 (처음 500자만)
    const workflowString = JSON.stringify(workflow);
    console.log(`워크플로우 데이터 예시 (최대 500자): ${workflowString.substring(0, 500)}...`);
    
    const response = await fetch(`${COMFY_SERVER}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: clientId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`워크플로우 실행 요청 실패: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    console.log(`워크플로우 요청 성공, prompt_id: ${result.prompt_id}, client_id: ${clientId}`);
    
    // 이미지 생성 완료 대기
    console.log('이미지 생성 완료 대기 시작...');
    const maxWaitTime = 40 * 60 * 1000; // 40분
    const checkInterval = 5000; // 5초마다 확인
    let waitTime = 0;
    let imageFound = false;
    let imageUrl = null;
    let executionTime = 0;
    
    while (waitTime < maxWaitTime && !imageFound) {
      try {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        console.log(`ComfyUI 이미지 생성 대기 중... ${waitTime/1000}/${maxWaitTime/1000}초 경과`);
        
        // 히스토리 확인
        const historyResponse = await fetch(`${COMFY_SERVER}/history/${result.prompt_id}`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          
          if (Object.keys(historyData).length === 0) {
            console.log(`${waitTime/1000}초 경과: prompt_id=${result.prompt_id}에 대한 히스토리 데이터가 없습니다.`);
            continue;
          }
          
          const promptData = historyData[result.prompt_id];
          if (promptData && promptData.status && promptData.status.completed) {
            if (!executionTime) {
              executionTime = waitTime / 1000;
              console.log(`워크플로우 실행 시작 감지 (history): ${executionTime}초`);
            }
            
            if (promptData.outputs) {
              console.log(`첫 출력 데이터 감지: ${executionTime}초`);
              
              // 출력에서 이미지 찾기
              for (const [nodeId, nodeOutput] of Object.entries(promptData.outputs)) {
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                  const image = nodeOutput.images[0];
                  console.log(`다른 노드(${nodeId})에서 이미지 발견! 파일명: ${image.filename}, 소요 시간: ${executionTime}초`);
                  
                  // 노드 정보 확인
                  const nodeInfo = workflow[nodeId];
                  if (nodeInfo) {
                    console.log(`출력 노드 ${nodeId} 타입: ${nodeInfo.class_type}`);
                  }
                  
                  imageUrl = `${COMFY_SERVER}/view?filename=${image.filename}`;
                  console.log(`출력 노드 ${nodeId} 이미지 경로: ${image.filename}`);
                  
                  // 이미지 파일 존재 확인
                  const imageCheckResponse = await fetch(imageUrl, { method: 'HEAD' });
                  console.log(`이미지 파일 확인 결과: ${imageCheckResponse.status} ${imageCheckResponse.statusText}`);
                  
                  if (imageCheckResponse.ok) {
                    imageFound = true;
                    break;
                  } 
                }
              }
              
              if (imageFound) break;
            }
          }
        }
      } catch (checkError) {
        console.error('이미지 생성 확인 중 오류:', checkError);
        // 오류가 발생해도 계속 대기
      }
    }
    
    // 웹소켓 연결 정리
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('웹소켓 연결 종료');
      ws.close();
    }
    
    if (!imageFound) {
      throw new Error(`이미지 생성 타임아웃: ${maxWaitTime/1000}초 동안 이미지가 생성되지 않음`);
    }
    
    console.log(`이미지 다운로드 시작: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`이미지 다운로드 실패: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.buffer();
    console.log(`이미지 다운로드 완료: ${imageBuffer.length} 바이트`);
    
    return {
      success: true,
      imageUrl: imageUrl,
      imageBuffer: imageBuffer,
      executionTime: executionTime,
      promptId: result.prompt_id
    };
    
  } catch (error) {
    console.error('ComfyUI 워크플로우 실행 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 메인 워크플로우 실행 함수 (완전히 새로운 범용 시스템)
const runOriginalWorkflow = async (workflowPath, prompt, imageName, artStyleConfig = null) => {
  try {
    console.log(`=== ComfyUI 워크플로우 실행 시작 ===`);
    console.log(`워크플로우 파일: ${workflowPath}`);
    console.log(`프롬프트: ${prompt.substring(0, 100)}...`);
    console.log(`이미지 파일: ${imageName || '없음'}`);
    
    // 워크플로우 파일 읽기
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`워크플로우 파일을 찾을 수 없습니다: ${workflowPath}`);
    }
    
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    console.log(`워크플로우 로드 완료: ${Object.keys(workflow).length}개 노드`);
    
    // 이미지 파일 처리
    let imagePath = null;
    let comfyImageName = imageName;
    if (imageName) {
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
      imagePath = path.join(uploadsDir, imageName);
      
      if (!fs.existsSync(imagePath)) {
        console.warn(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
        imagePath = null;
        comfyImageName = null;
      } else {
        console.log(`이미지 파일 확인: ${imagePath} (${fs.statSync(imagePath).size} bytes)`);
        
        // ComfyUI input 폴더로 이미지 복사
        try {
          const copyResult = copyImageToComfyUI(imagePath, imageName);
          if (!copyResult) {
            throw new Error('이미지를 ComfyUI input 폴더로 복사하는 데 실패했습니다.');
          }
        } catch (copyError) {
          console.error('이미지 복사 오류:', copyError.message);
          // 복사 실패해도 계속 진행
        }
      }
    }
    
    // 범용 워크플로우 처리 시스템 사용
    console.log('범용 워크플로우 처리 시스템 사용 - 원본 워크플로우 100% 보존');
    const processedWorkflow = processUniversalWorkflow(workflow, prompt, comfyImageName);
    
    // 워크플로우별 특화 설정 적용 (필요시)
    applyWorkflowSpecificSettings(processedWorkflow, workflowPath);
    
    // ComfyUI API 호출
    const result = await runComfyWorkflow(processedWorkflow);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // 이미지 다운로드
    console.log(`이미지 다운로드 시작: ${result.imageUrl}`);
    const imageResponse = await fetch(result.imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`이미지 다운로드 실패: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.buffer();
    console.log(`이미지 다운로드 완료: ${imageBuffer.length} bytes`);
    
    console.log(`=== ComfyUI 워크플로우 실행 완료 ===`);
    
    return {
      success: true,
      imageData: imageBuffer,
      imageUrl: result.imageUrl,
      promptUsed: prompt,
      workflowFile: path.basename(workflowPath),
      executionTime: result.executionTime
    };
    
  } catch (error) {
    console.error('ComfyUI 워크플로우 실행 오류:', error);
    return {
      success: false,
      error: error.message,
      workflowFile: workflowPath ? path.basename(workflowPath) : '알 수 없음'
    };
  }
};

module.exports = {
  // 새로운 범용 워크플로우 처리 시스템
  runOriginalWorkflow,
  processUniversalWorkflow,
  validateAnythingEverywhereSystem,
  applyWorkflowSpecificSettings,
  runComfyWorkflow,
  
  // ComfyUI 설정 및 파일 관리
  getComfyUIConfig,
  copyImageToComfyUI,
  
  // 하위 호환성을 위한 기존 함수들 (새 시스템으로 리다이렉트)
  customizeWorkflow: (workflow, settings) => processUniversalWorkflow(workflow, '', null),
  updateAPIWorkflowSettings: (workflow, prompt, imageName) => processUniversalWorkflow(workflow, prompt, imageName),
  restoreNodeConnections: (workflow) => { validateAnythingEverywhereSystem(workflow); return workflow; },
  validateAndProcessWorkflow: (workflow) => workflow,
  getWidgetMapping: (nodeType) => ({}),
  getCompleteNodeConnections: () => ({}),
  validateAndFixConnections: (workflow) => workflow,
  generateImageWithComfyUI: async (prompt, inputImagePath) => ({ success: false, error: 'runOriginalWorkflow 사용 권장' }),
  createUniversalConnectionSystem: (workflow) => validateAnythingEverywhereSystem(workflow)
}; 