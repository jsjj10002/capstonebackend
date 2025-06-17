// axios 대신 node의 기본 fetch API 사용
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const fetch = require('node-fetch');

// 워크플로우 커스터마이징 함수
const customizeWorkflow = (workflow, settings) => {
  console.log('워크플로우 커스터마이징 시작...');
  const modifiedWorkflow = JSON.parse(JSON.stringify(workflow));
  
  const {
    prompt,
    imagePath,
    checkpointName,
    negativePrompt,
    steps,
    cfg,
    sampler,
    scheduler,
    loraFile,
    loraStrength
  } = settings;
  
  // 신카이 마코토 워크플로우인지 확인
  const isMakotoWorkflow = workflow.nodes && Array.isArray(workflow.nodes);
  
  if (isMakotoWorkflow) {
    // 신카이 마코토 워크플로우 처리 (새로운 형식)
    console.log('신카이 마코토 워크플로우 감지됨');
    
    // 각 노드를 순회하며 설정 변경
    for (const node of modifiedWorkflow.nodes) {
      // 체크포인트 로더 노드 (CheckpointLoaderSimple)
      if (node.type === 'CheckpointLoaderSimple' && checkpointName) {
        node.widgets_values[0] = checkpointName;
        console.log(`체크포인트 설정: ${checkpointName}`);
      }
      
      // LoRA 로더 노드
      if (node.type === 'LoraLoader' && loraFile) {
        node.widgets_values[0] = loraFile;
        node.widgets_values[1] = loraStrength || 1.0;
        console.log(`LoRA 설정: ${loraFile}, 강도: ${loraStrength || 1.0}`);
      }
      
      // 이미지 로드 노드
      if (node.type === 'LoadImage' && imagePath) {
        const imageFileName = path.basename(imagePath);
        node.widgets_values[0] = imageFileName;
        console.log(`이미지 파일 설정: ${imageFileName}`);
      }
      
      // 긍정 프롬프트 노드
      if (node.type === 'CLIPTextEncode' && node.id === 6 && prompt) {
        node.widgets_values[0] = prompt;
        console.log(`긍정 프롬프트 설정 (노드 6): ${prompt.substring(0, 50)}...`);
      }
      
      // 부정 프롬프트 노드
      if (node.type === 'CLIPTextEncode' && node.id === 7 && negativePrompt) {
        node.widgets_values[0] = negativePrompt;
        console.log(`부정 프롬프트 설정 (노드 7): ${negativePrompt.substring(0, 50)}...`);
      }
      
      // KSampler 노드 설정
      if (node.type === 'KSampler') {
        const seed = Math.floor(Math.random() * 1000000000000000);
        node.widgets_values[0] = seed; // seed
        if (steps) node.widgets_values[2] = steps;
        if (cfg) node.widgets_values[3] = cfg;
        if (sampler) node.widgets_values[4] = sampler;
        if (scheduler) node.widgets_values[5] = scheduler;
        console.log(`KSampler 설정 - Steps: ${steps}, CFG: ${cfg}, Sampler: ${sampler}, Scheduler: ${scheduler}`);
      }
      
      // BasicScheduler 노드의 steps 설정
      if (node.type === 'BasicScheduler' && steps) {
        node.widgets_values[1] = steps; // steps
        console.log(`BasicScheduler steps 설정: ${steps}`);
      }
      
      // KSamplerSelect 노드의 sampler 설정
      if (node.type === 'KSamplerSelect' && sampler) {
        node.widgets_values[0] = sampler;
        console.log(`KSamplerSelect sampler 설정: ${sampler}`);
      }
    }
  } else {
    // 기존 워크플로우 처리 (구형식)
    console.log('기본 워크플로우 형식 감지됨');
    
    // 체크포인트 설정 (노드 4)
    if (modifiedWorkflow['4'] && checkpointName) {
      modifiedWorkflow['4'].inputs.ckpt_name = checkpointName;
      console.log(`체크포인트 설정: ${checkpointName}`);
    }
    
    // 입력 이미지 경로 수정 (프로필 사진)
    if (modifiedWorkflow['46']) {
      // 파일 존재 확인
      if (!fs.existsSync(imagePath)) {
        console.error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
      } else {
        console.log(`이미지 파일 확인됨: ${imagePath} (${fs.statSync(imagePath).size} 바이트)`);
      }
      
      // 이미지 경로 설정
      modifiedWorkflow['46'].inputs.image = imagePath;
      console.log(`이미지 경로 설정 완료: ${imagePath}`);
    }
    
    // 프롬프트 텍스트 설정
    if (modifiedWorkflow['54']) {
      modifiedWorkflow['54'].inputs.text = prompt;
      console.log(`노드 54에 프롬프트 설정 완료 (${prompt.length}자)`);
    }
    
    if (modifiedWorkflow['56']) {
      modifiedWorkflow['56'].inputs.text = prompt;
      console.log(`노드 56에 프롬프트 설정 완료`);
    }
    
    // 부정 프롬프트 설정
    if (modifiedWorkflow['55'] && negativePrompt) {
      modifiedWorkflow['55'].inputs.text = negativePrompt;
      console.log(`부정 프롬프트 설정: ${negativePrompt.substring(0, 50)}...`);
    }
    
    // KSampler 설정
    if (modifiedWorkflow['50']) {
      const seed = Math.floor(Math.random() * 1000000000000000);
      modifiedWorkflow['50'].inputs.seed = seed;
      if (steps) modifiedWorkflow['50'].inputs.steps = steps;
      if (cfg) modifiedWorkflow['50'].inputs.cfg = cfg;
      if (sampler) modifiedWorkflow['50'].inputs.sampler_name = sampler;
      if (scheduler) modifiedWorkflow['50'].inputs.scheduler = scheduler;
      console.log(`KSampler 설정 - Steps: ${steps}, CFG: ${cfg}, Sampler: ${sampler}`);
    }
    
    if (modifiedWorkflow['58']) {
      const seed = Math.floor(Math.random() * 1000000000000000);
      modifiedWorkflow['58'].inputs.seed = seed;
      if (steps) modifiedWorkflow['58'].inputs.steps = steps;
      if (cfg) modifiedWorkflow['58'].inputs.cfg = cfg;
      if (sampler) modifiedWorkflow['58'].inputs.sampler_name = sampler;
      if (scheduler) modifiedWorkflow['58'].inputs.scheduler = scheduler;
    }
  }
  
  console.log('워크플로우 커스터마이징 완료');
  return modifiedWorkflow;
};

// ComfyUI API 호출 함수 - fetch API 사용
const runComfyWorkflow = async (workflow) => {
  try {
    const COMFY_SERVER = process.env.COMFY_SERVER_URL || 'http://127.0.0.1:8188';
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
        console.log(`웹소켓 연결 종료: 코드=${code}, 이유=${reason || '없음'}`);
      });
    } catch (wsError) {
      console.error('웹소켓 연결 실패:', wsError);
      // 웹소켓 연결 실패도 치명적 오류로 간주하지 않음 - 폴링으로 진행
    }
    
    // 워크플로우 실행 요청
    console.log('ComfyUI 워크플로우 실행 요청 전송...');
    console.log('워크플로우 데이터 예시 (최대 500자):', JSON.stringify(workflow).substring(0, 500) + '...');
    
    // API 요청 객체 준비
    const clientId = `node_backend_${Date.now()}`;
    const promptRequestBody = {
      prompt: workflow,
      client_id: clientId,
      extra_data: {
        extra_pnginfo: {
          workflow: JSON.stringify(workflow), // 워크플로우 원본 저장
        }
      }
    };
    
    const promptResponse = await fetch(`${COMFY_SERVER}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptRequestBody)
    });
    
    if (!promptResponse.ok) {
      console.error(`ComfyUI 서버 응답 오류: ${promptResponse.status} ${promptResponse.statusText}`);
      
      try {
        const errorData = await promptResponse.text();
        console.error('응답 데이터:', errorData);
      } catch (err) {
        console.error('응답 데이터를 읽는 중 오류 발생');
      }
      
      // 워크플로우에 진단 정보 추가
      console.error('워크플로우 노드 수:', Object.keys(workflow).length);
      console.error('사용된 노드 ID:', Object.keys(workflow).join(', '));
      
      // 중요 노드 확인
      const criticalNodes = ['46', '54', '56'];
      for (const nodeId of criticalNodes) {
        if (!workflow[nodeId]) {
          console.error(`중요 노드 누락: ${nodeId}`);
        } else {
          console.log(`노드 ${nodeId} 정보:`, JSON.stringify(workflow[nodeId]).substring(0, 100));
        }
      }
      
      return {
        success: false,
        error: `ComfyUI 서버 응답 오류: ${promptResponse.status} ${promptResponse.statusText}`
      };
    }
    
    const promptData = await promptResponse.json();
    const prompt_id = promptData.prompt_id;
    console.log(`워크플로우 요청 성공, prompt_id: ${prompt_id}, client_id: ${clientId}`);
    
    // 이미지 생성 완료 대기 (폴링)
    const maxRetries = 2400; // 최대 2400초(40분) 대기
    let retryCount = 0;
    let imageUrl = null;
    
    // 파이프라인 진행 상태 추적
    let hasExecutionStarted = false;
    let hasNodesData = false;
    let hasAnyOutputs = false;
    
    // 진행 상태 출력 간격 설정
    const statusLogIntervals = {
      initial: 5,   // 처음 30초
      normal: 10,   // 30초~5분
      extended: 30  // 5분 이후
    };
    
    console.log('이미지 생성 완료 대기 시작...');
    
    while (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      
      // 현재 로그 간격 결정
      let currentInterval;
      if (retryCount < 30) {
        currentInterval = statusLogIntervals.initial;
      } else if (retryCount < 300) {
        currentInterval = statusLogIntervals.normal;
      } else {
        currentInterval = statusLogIntervals.extended;
      }
      
      // 진행 상황 로깅
      if (retryCount % currentInterval === 0) {
        console.log(`ComfyUI 이미지 생성 대기 중... ${retryCount}/${maxRetries}초 경과`);
      }
      
      try {
        // 진행 상황 확인을 위해 웹소켓 연결 확인
        if (wsConnected) {
          if (!executionStarted && retryCount > 30 && retryCount % 10 === 0) {
            console.warn('웹소켓은 연결되었지만 실행 시작 메시지가 없습니다.');
            
            // 5분 이후에도 실행이 시작되지 않으면 상태 요청 다시 보내기
            if (retryCount > 300 && retryCount % 60 === 0) {
              try {
                ws.send(JSON.stringify({
                  type: "get_status",
                  client_id: clientId
                }));
                console.log(`상태 요청 다시 전송 (${retryCount}초 경과)`);
              } catch (sendErr) {
                console.error('웹소켓 상태 요청 전송 오류:', sendErr);
              }
            }
          }
        }
        
        const historyResponse = await fetch(`${COMFY_SERVER}/history`);
        if (!historyResponse.ok) {
          console.error(`히스토리 조회 응답 오류: ${historyResponse.status}`);
          continue;
        }
        
        const history = await historyResponse.json();
        
        if (history[prompt_id]) {
          if (!hasExecutionStarted) {
            hasExecutionStarted = true;
            console.log(`워크플로우 실행 시작 감지 (history): ${retryCount}초`);
          }
          
          // 노드별 상태 확인
          if (history[prompt_id].nodes) {
            if (!hasNodesData) {
              hasNodesData = true;
              console.log(`노드 데이터 감지: ${retryCount}초`);
            }
            
            if (retryCount % 30 === 0) {
              console.log(`히스토리 데이터 확인 (${retryCount}초):`);
              console.log(`- 노드 데이터 존재 여부: 예`);
              const nodeIds = Object.keys(history[prompt_id].nodes);
              console.log(`- 기록된 노드 ID: ${nodeIds.join(', ')}`);
              
              // 노드별 진행 상태 확인
              for (const nodeId of ['50', '58']) {
                if (history[prompt_id].nodes[nodeId]) {
                  console.log(`- 노드 ${nodeId} 상태:`, JSON.stringify(history[prompt_id].nodes[nodeId]).substring(0, 100));
                }
              }
            }
          } else {
            if (retryCount % 30 === 0) {
              console.log(`히스토리 데이터 확인 (${retryCount}초):`);
              console.log(`- 노드 데이터 존재 여부: 아니오`);
            }
          }
          
          // 출력 데이터 확인
          if (history[prompt_id].outputs) {
            const outputs = history[prompt_id].outputs;
            const outputNodeIds = Object.keys(outputs);
            
            if (!hasAnyOutputs && outputNodeIds.length > 0) {
              hasAnyOutputs = true;
              console.log(`첫 출력 데이터 감지: ${retryCount}초`);
            }
            
            if (retryCount % 5 === 0) {
              console.log(`ComfyUI 워크플로우 실행중: prompt_id=${prompt_id}, 출력 노드 수=${outputNodeIds.length}`);
              if (outputNodeIds.length > 0) {
                console.log(`출력 노드 ID: ${outputNodeIds.join(', ')}`);
              }
            }
            
            // SaveImage 노드 찾기 (노드 51)
            if (outputs['51'] && outputs['51'].images && outputs['51'].images.length > 0) {
              const imageName = outputs['51'].images[0].filename;
              imageUrl = `${COMFY_SERVER}/view?filename=${imageName}`;
              console.log(`SaveImage 노드(51)에서 이미지 생성 완료! 파일명: ${imageName}, 소요 시간: ${retryCount}초`);
              break;
            } 
            // 51번 노드에 이미지가 없을 경우 다른 노드에서도 이미지 찾기
            else if (retryCount > 10) { // 충분히 기다린 후에 다른 노드 확인
              for (const nodeId in outputs) {
                if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                  const imageName = outputs[nodeId].images[0].filename;
                  imageUrl = `${COMFY_SERVER}/view?filename=${imageName}`;
                  console.log(`다른 노드(${nodeId})에서 이미지 발견! 파일명: ${imageName}, 소요 시간: ${retryCount}초`);
                  
                  // 출력 노드 정보 기록
                  console.log(`출력 노드 ${nodeId} 타입: ${workflow[nodeId]?.class_type || '알 수 없음'}`);
                  console.log(`출력 노드 ${nodeId} 이미지 경로: ${imageName}`);
                  
                  // ComfyUI 출력 폴더에서 실제 파일 확인 요청
                  try {
                    const fileCheckResponse = await fetch(`${COMFY_SERVER}/view?filename=${imageName}`, {
                      method: 'HEAD'
                    });
                    console.log(`이미지 파일 확인 결과: ${fileCheckResponse.status} ${fileCheckResponse.statusText}`);
                    if (fileCheckResponse.ok) {
                      break;
                    } else {
                      console.error(`노드 ${nodeId}의 이미지 파일이 존재하지 않습니다`);
                      imageUrl = null; // 파일이 없으면 URL 제거
                    }
                  } catch (fileCheckErr) {
                    console.error(`이미지 파일 확인 오류:`, fileCheckErr);
                    imageUrl = null;
                  }
                }
              }
              
              if (imageUrl) break;
            }
            
            // 모든 출력 노드 정보 확인
            if (retryCount % 10 === 0 && retryCount > 20) {
              console.log('=== 모든 출력 노드 정보 ===');
              for (const nodeId in outputs) {
                console.log(`노드 ${nodeId} 출력:`, JSON.stringify(outputs[nodeId]).substring(0, 100));
              }
            }
          }
        } else {
          if (retryCount % 20 === 0) {
            console.warn(`${retryCount}초 경과: prompt_id=${prompt_id}에 대한 히스토리 데이터가 없습니다.`);
            
            // 오래 기다렸는데도 히스토리 데이터가 없으면 Queue 상태 확인
            if (retryCount > 60 && retryCount % 60 === 0) {
              try {
                const queueResponse = await fetch(`${COMFY_SERVER}/queue`);
                if (queueResponse.ok) {
                  const queueData = await queueResponse.json();
                  console.log(`Queue 상태: ${JSON.stringify(queueData).substring(0, 200)}...`);
                  
                  // 큐에 작업이 있는지 확인
                  if (queueData.queue_running.length > 0) {
                    console.log(`현재 실행 중인 작업: ${queueData.queue_running.length}개`);
                  }
                  
                  if (queueData.queue_pending.length > 0) {
                    console.log(`대기 중인 작업: ${queueData.queue_pending.length}개`);
                    // 현재 작업이 큐에 있는지 확인
                    const ourPromptInQueue = queueData.queue_pending.some(item => item[1].prompt_id === prompt_id);
                    if (ourPromptInQueue) {
                      console.log(`우리 작업(${prompt_id})이 큐에서 대기 중입니다.`);
                    } else {
                      console.warn(`우리 작업(${prompt_id})을 큐에서 찾을 수 없습니다!`);
                    }
                  }
                }
              } catch (queueErr) {
                console.error('큐 상태 확인 오류:', queueErr.message);
              }
            }
          }
        }
      } catch (historyError) {
        console.error(`워크플로우 상태 확인 중 오류 (${retryCount}초): ${historyError.message}`);
      }
      
      retryCount++;
    }
    
    // 웹소켓 연결 종료
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      console.log('웹소켓 연결 종료');
    }
    
    if (!imageUrl) {
      return {
        success: false,
        error: '이미지 생성 타임아웃'
      };
    }
    
    // 이미지 다운로드
    console.log(`이미지 다운로드 시작: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`이미지 다운로드 오류: ${imageResponse.status}`);
      
      // 추가 진단: 모든 이미지 목록 가져오기 시도
      try {
        const imagesResponse = await fetch(`${COMFY_SERVER}/images`);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          console.log(`사용 가능한 이미지 목록(최대 5개): ${JSON.stringify(imagesData).substring(0, 500)}...`);
        }
      } catch (imgListErr) {
        console.error('이미지 목록 조회 오류:', imgListErr);
      }
      
      return {
        success: false,
        error: '이미지 다운로드 실패'
      };
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageData = Buffer.from(arrayBuffer);
    console.log(`이미지 다운로드 완료: ${imageData.length} 바이트`);
    
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

// runOriginalWorkflow 함수를 워크플로우 그대로 사용하도록 수정
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
          const comfyInputDir = 'C:\\ComfyUI_windows_portable_nvidia\\ComfyUI_windows_portable\\ComfyUI\\input';
          if (fs.existsSync(comfyInputDir)) {
            const destPath = path.join(comfyInputDir, imageName);
            fs.copyFileSync(imagePath, destPath);
            console.log(`이미지 ComfyUI input 폴더로 복사 완료: ${destPath}`);
          } else {
            console.warn(`ComfyUI input 폴더를 찾을 수 없습니다: ${comfyInputDir}`);
          }
        } catch (copyError) {
          console.error('이미지 복사 오류:', copyError.message);
          // 복사 실패해도 계속 진행
        }
      }
    }
    
    console.log('워크플로우를 그대로 사용합니다 (설정 오버라이드 없음)');
    
    // 워크플로우 그대로 사용 - 프롬프트와 이미지만 교체
    updateAPIWorkflowSettings(workflow, prompt, comfyImageName);
    
    // ComfyUI API 호출
    const result = await runComfyWorkflow(workflow);
    
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
      workflowFile: path.basename(workflowPath)
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

// API 형식 워크플로우 설정 업데이트 함수
const updateAPIWorkflowSettings = (workflow, prompt, imageName) => {
  console.log('API 워크플로우 설정 업데이트 시작...');
  
  // 범용 연결 복구 시스템 사용
  createUniversalConnectionSystem(workflow);
  
  for (const nodeId in workflow) {
    const node = workflow[nodeId];
    
    // 긍정 프롬프트 노드 찾기 (CLIPTextEncode)
    if (node.class_type === 'CLIPTextEncode') {
      // 노드 6번이 긍정 프롬프트 (부정 프롬프트 텍스트가 아닌 경우)
      if (nodeId === '6' || (node.inputs.text && !node.inputs.text.toLowerCase().includes('embedding:badhand'))) {
        node.inputs.text = prompt;
        console.log(`프롬프트 설정 (노드 ${nodeId}): ${prompt.substring(0, 50)}...`);
      }
    }
    
    // 이미지 로드 노드 (LoadImage)
    if (node.class_type === 'LoadImage' && imageName) {
      node.inputs.image = imageName;
      console.log(`이미지 파일 설정 (노드 ${nodeId}): ${imageName}`);
    }
    
    // 시드 랜덤화 (KSampler)
    if (node.class_type === 'KSampler' && node.inputs.seed !== undefined) {
      const seed = Math.floor(Math.random() * 1000000000000000);
      node.inputs.seed = seed;
      console.log(`시드 설정 (노드 ${nodeId}): ${seed}`);
    }
    
    // 시드 랜덤화 (SamplerCustom)
    if (node.class_type === 'SamplerCustom' && node.inputs.noise_seed !== undefined) {
      const seed = Math.floor(Math.random() * 1000000000000000);
      node.inputs.noise_seed = seed;
      console.log(`시드 설정 (노드 ${nodeId}): ${seed}`);
    }
  }
  
  console.log('API 워크플로우 설정 업데이트 완료');
};

// 노드 연결 정보 복구 함수
const restoreNodeConnections = (workflow) => {
  console.log('노드 연결 정보 복구 시작...');
  
  // Anything Everywhere 시스템이 제공하는 연결 정보 매핑
  const anythingEverywhereConnections = {
    // 노드 22 (Anything Everywhere3)가 제공하는 연결
    model: ["46", 0],  // 노드 46의 model 출력
    vae: ["13", 0],    // 노드 13의 vae 출력
    // 노드 26 (Prompts Everywhere)가 제공하는 연결  
    positive: ["6", 0], // 노드 6의 positive 출력
    negative: ["7", 0]  // 노드 7의 negative 출력
  };
  
  // 각 노드의 필수 연결 정보 복구
  for (const nodeId in workflow) {
    const node = workflow[nodeId];
    
    switch (node.class_type) {
      case 'BasicScheduler':
        if (nodeId === '54') {
          // model 연결 복구
          if (!node.inputs.model) {
            node.inputs.model = anythingEverywhereConnections.model;
            console.log(`노드 ${nodeId} model 연결 복구: ${JSON.stringify(anythingEverywhereConnections.model)}`);
          }
        }
        break;
        
      case 'SamplerCustom':
        if (nodeId === '56') {
          // model, positive, negative 연결 복구
          if (!node.inputs.model) {
            node.inputs.model = anythingEverywhereConnections.model;
            console.log(`노드 ${nodeId} model 연결 복구: ${JSON.stringify(anythingEverywhereConnections.model)}`);
          }
          if (!node.inputs.positive) {
            node.inputs.positive = anythingEverywhereConnections.positive;
            console.log(`노드 ${nodeId} positive 연결 복구: ${JSON.stringify(anythingEverywhereConnections.positive)}`);
          }
          if (!node.inputs.negative) {
            node.inputs.negative = anythingEverywhereConnections.negative;
            console.log(`노드 ${nodeId} negative 연결 복구: ${JSON.stringify(anythingEverywhereConnections.negative)}`);
          }
        }
        break;
        
      case 'KSampler':
        if (nodeId === '21') {
          // model, positive, negative 연결 복구
          if (!node.inputs.model) {
            node.inputs.model = anythingEverywhereConnections.model;
            console.log(`노드 ${nodeId} model 연결 복구: ${JSON.stringify(anythingEverywhereConnections.model)}`);
          }
          if (!node.inputs.positive) {
            node.inputs.positive = anythingEverywhereConnections.positive;
            console.log(`노드 ${nodeId} positive 연결 복구: ${JSON.stringify(anythingEverywhereConnections.positive)}`);
          }
          if (!node.inputs.negative) {
            node.inputs.negative = anythingEverywhereConnections.negative;
            console.log(`노드 ${nodeId} negative 연결 복구: ${JSON.stringify(anythingEverywhereConnections.negative)}`);
          }
        }
        break;
        
      case 'VAEDecodeTiled':
        if (nodeId === '38') {
          // vae 연결 복구
          if (!node.inputs.vae) {
            node.inputs.vae = anythingEverywhereConnections.vae;
            console.log(`노드 ${nodeId} vae 연결 복구: ${JSON.stringify(anythingEverywhereConnections.vae)}`);
          }
        }
        break;
        
      case 'CLIPTextEncode':
        if (nodeId === '6' || nodeId === '7') {
          node.inputs.clip = ["10", 1];      // LoraLoader에서 CLIP
          console.log(`노드 ${nodeId} clip 연결 복구: ["10", 1]`);
        }
        break;
        
      case 'LoraLoader':
        if (nodeId === '10') {
          node.inputs.model = ["4", 0];      // CheckpointLoader에서 모델
          node.inputs.clip = ["16", 0];      // CLIPSetLastLayer에서 CLIP
          console.log(`노드 ${nodeId} 연결 복구: model=["4",0], clip=["16",0]`);
        }
        break;
        
      case 'CLIPSetLastLayer':
        if (nodeId === '16') {
          node.inputs.clip = ["15", 0];      // CLIPLoader에서 CLIP
          console.log(`노드 ${nodeId} clip 연결 복구: ["15", 0]`);
        }
        break;
        
      case 'FreeU_V2':
        if (nodeId === '19') {
          node.inputs.model = ["10", 0];     // LoraLoader에서 모델
          console.log(`노드 ${nodeId} model 연결 복구: ["10", 0]`);
        }
        break;
        
      case 'LatentUpscaleBy':
        if (nodeId === '20') {
          node.inputs.samples = ["56", 1];   // SamplerCustom에서 latent
          console.log(`노드 ${nodeId} samples 연결 복구: ["56", 1]`);
        }
        break;
        
      case 'SplitSigmas':
        if (nodeId === '55') {
          node.inputs.sigmas = ["54", 0];    // BasicScheduler에서 시그마
          console.log(`노드 ${nodeId} sigmas 연결 복구: ["54", 0]`);
        }
        break;
        
      case 'IPAdapterUnifiedLoaderFaceID':
        if (nodeId === '45') {
          node.inputs.model = ["19", 0];     // FreeU_V2에서 모델
          console.log(`노드 ${nodeId} model 연결 복구: ["19", 0]`);
        }
        break;
        
      case 'IPAdapterFaceID':
        if (nodeId === '46') {
          node.inputs.model = ["45", 0];     // IPAdapterUnifiedLoader에서 모델
          node.inputs.ipadapter = ["45", 1]; // IPAdapterUnifiedLoader에서 어댑터
          node.inputs.image = ["42", 0];     // LoadImage에서 이미지
          console.log(`노드 ${nodeId} 연결 복구: model=["45",0], ipadapter=["45",1], image=["42",0]`);
        }
        break;
        
      case 'SaveImage':
        if (nodeId === '9') {
          node.inputs.images = ["38", 0];    // VAEDecodeTiled에서 이미지
          console.log(`노드 ${nodeId} images 연결 복구: ["38", 0]`);
        }
        break;
        
      case 'Anything Everywhere3':
        if (nodeId === '22') {
          node.inputs.anything = ["46", 0];  // IPAdapterFaceID에서 모델
          node.inputs.anything3 = ["13", 0]; // VAELoader에서 VAE
          console.log(`노드 ${nodeId} 연결 복구: anything=["46",0], anything3=["13",0]`);
        }
        break;
        
      case 'Prompts Everywhere':
        if (nodeId === '26') {
          node.inputs['+ve'] = ["6", 0];     // 긍정 프롬프트
          node.inputs['-ve'] = ["7", 0];     // 부정 프롬프트
          console.log(`노드 ${nodeId} 연결 복구: +ve=["6",0], -ve=["7",0]`);
        }
        break;
        
      case 'KSamplerSelect':
        if (nodeId === '57') {
          // KSamplerSelect는 입력 연결이 필요하지 않음 (sampler_name만 설정)
          console.log(`노드 ${nodeId} 연결 확인됨 (입력 불필요)`);
        }
        break;
        
      case 'DetailDaemonSamplerNode':
        if (nodeId === '58') {
          node.inputs.sampler = ["57", 0];   // KSamplerSelect에서 샘플러
          console.log(`노드 ${nodeId} sampler 연결 복구: ["57", 0]`);
        }
        break;
    }
  }
  
  console.log('노드 연결 정보 복구 완료');
};

const validateAndProcessWorkflow = (workflow) => {
  console.log('워크플로우 형식 검증 시작...');
  
  // API 형식인지 확인 (노드 ID를 키로 하는 객체)
  const workflowKeys = Object.keys(workflow);
  const hasNumericKeys = workflowKeys.some(key => !isNaN(key));
  const hasClassTypes = workflowKeys.some(key => 
    workflow[key] && typeof workflow[key] === 'object' && 'class_type' in workflow[key]
  );
  
  if (hasNumericKeys && hasClassTypes) {
    console.log(`API 형식 워크플로우 감지: ${workflowKeys.length}개 노드`);
    
    // 메타데이터 제거 및 API 형식 정리
    const cleanWorkflow = {};

    // API 형식 검증
    for (const nodeId in workflow) {
      const node = workflow[nodeId];
      if (!node.class_type) {
        throw new Error(`노드 ${nodeId}에 class_type 속성이 없습니다.`);
      }
      if (!node.inputs) {
        workflow[nodeId].inputs = {};
      }

      // 깨끗한 노드 객체 생성 (메타데이터 제거)
      cleanWorkflow[nodeId] = {
        class_type: node.class_type,
        inputs: node.inputs || {}
      };

    }
    console.log(`메타데이터 정리 완료: ${Object.keys(cleanWorkflow).length}개 노드`);
    return workflow; // 이미 올바른 API 형식
  }
  
  // UI 형식인지 확인 (nodes 배열이 있는 경우)
  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    console.log(`UI 형식 워크플로우 감지: ${workflow.nodes.length}개 노드`);
    
    // API 형식으로 변환
    const apiWorkflow = {};
    
    for (const node of workflow.nodes) {
      if (!node.id || !node.type) {
        console.warn(`노드 ID ${node.id}: type 또는 id 누락, 건너뜀`);
        continue;
      }
      
      apiWorkflow[node.id.toString()] = {
        class_type: node.type,
        inputs: {}
      };
      
      // 위젯 값을 inputs에 추가
      if (node.widgets_values && node.widgets_values.length > 0) {
        const widgetMapping = getWidgetMapping(node.type);
        widgetMapping.forEach((paramName, index) => {
          if (index < node.widgets_values.length) {
            apiWorkflow[node.id.toString()].inputs[paramName] = node.widgets_values[index];
          }
        });
      }
    }
    
    console.log(`UI→API 변환 완료: ${Object.keys(apiWorkflow).length}개 노드`);
    return apiWorkflow;
  }
  
  throw new Error('유효하지 않은 워크플로우 형식: API 형식도 UI 형식도 아닙니다.');
};

// 위젯 매핑 헬퍼 함수
const getWidgetMapping = (nodeType) => {
  const mappings = {
    'CLIPTextEncode': ['text'],
    'CheckpointLoaderSimple': ['ckpt_name'],
    'LoadImage': ['image'],
    'SaveImage': ['filename_prefix'],
    'EmptyLatentImage': ['width', 'height', 'batch_size'],
    'KSampler': ['seed', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
    'SamplerCustom': ['add_noise', 'noise_seed', 'cfg'],
    'VAELoader': ['vae_name'],
    'CLIPLoader': ['clip_name'],
    'LoraLoader': ['lora_name', 'strength_model', 'strength_clip'],
    'VAEDecodeTiled': ['tile_size'],
    'BasicScheduler': ['scheduler', 'steps', 'denoise'],
    'SplitSigmas': ['step'],
    'LatentUpscaleBy': ['upscale_method', 'scale_by']
  };
  return mappings[nodeType] || [];
};

// 완전한 노드 연결 매핑 (Makoto Shinkai 워크플로우 기준)
const getCompleteNodeConnections = () => {
  return {
    '4': { // CheckpointLoaderSimple
      inputs: {}
    },
    '5': { // EmptyLatentImage
      inputs: {}
    },
    '6': { // CLIPTextEncode (긍정)
      inputs: {
        clip: ['10', 1]
      }
    },
    '7': { // CLIPTextEncode (부정)
      inputs: {
        clip: ['10', 1]
      }
    },
    '9': { // SaveImage
      inputs: {
        images: ['38', 0]
      }
    },
    '10': { // LoraLoader
      inputs: {
        model: ['4', 0],
        clip: ['16', 0]
      }
    },
    '13': { // VAELoader
      inputs: {}
    },
    '15': { // CLIPLoader
      inputs: {}
    },
    '16': { // CLIPSetLastLayer
      inputs: {
        clip: ['15', 0]
      }
    },
    '19': { // FreeU_V2
      inputs: {
        model: ['10', 0]
      }
    },
    '20': { // LatentUpscaleBy
      inputs: {
        samples: ['56', 1]
      }
    },
    '21': { // KSampler
      inputs: {
        model: ['19', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['20', 0]
      }
    },
    '22': { // Anything Everywhere3
      inputs: {
        anything: ['46', 0],
        anything3: ['13', 0]
      }
    },
    '26': { // Prompts Everywhere
      inputs: {
        '+ve': ['6', 0],
        '-ve': ['7', 0]
      }
    },
    '38': { // VAEDecodeTiled
      inputs: {
        samples: ['21', 0],
        vae: ['13', 0]
      }
    },
    '42': { // LoadImage
      inputs: {}
    },
    '45': { // IPAdapterUnifiedLoaderFaceID
      inputs: {
        model: ['19', 0]
      }
    },
    '46': { // IPAdapterFaceID
      inputs: {
        model: ['45', 0],
        ipadapter: ['45', 1],
        image: ['42', 0]
      }
    },
    '54': { // BasicScheduler
      inputs: {
        model: ['19', 0]
      }
    },
    '55': { // SplitSigmas
      inputs: {
        sigmas: ['54', 0]
      }
    },
    '56': { // SamplerCustom
      inputs: {
        model: ['19', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        sampler: ['58', 0],
        sigmas: ['55', 0],
        latent_image: ['5', 0]
      }
    },
    '57': { // KSamplerSelect
      inputs: {}
    },
    '58': { // DetailDaemonSamplerNode
      inputs: {
        sampler: ['57', 0]
      }
    }
  };
};

// 연결 정보 복구 함수 개선
const validateAndFixConnections = (workflow) => {
  console.log('노드 연결 검증 시작...');
  
  const completeConnections = getCompleteNodeConnections();
  
  for (const nodeId in workflow) {
    if (completeConnections[nodeId]) {
      const expectedInputs = completeConnections[nodeId].inputs;
      const currentNode = workflow[nodeId];
      
      // 누락된 입력 연결 복구
      for (const inputName in expectedInputs) {
        if (!currentNode.inputs[inputName]) {
          currentNode.inputs[inputName] = expectedInputs[inputName];
          console.log(`노드 ${nodeId}에 ${inputName} 연결 복구: ${expectedInputs[inputName]}`);
        }
      }
    }
  }
  
  console.log('노드 연결 검증 완료');
  return workflow;
};

// 통합 이미지 생성 함수
const generateImageWithComfyUI = async (prompt, inputImagePath) => {
  try {
    console.log('ComfyUI 이미지 생성 시작...');
    console.log(`프롬프트: ${prompt.substring(0, 100)}...`);
    console.log(`입력 이미지: ${inputImagePath}`);
    
    // Makoto Shinkai 워크플로우 파일 로드
    const workflowPath = path.join(__dirname, '..', '..', 'Makoto Shinkai workflow.json');
    
    // 이미지 파일명 추출
    const imageName = inputImagePath ? path.basename(inputImagePath) : null;
    
    // 원본 워크플로우 그대로 실행 (커스터마이징 없이)
    const result = await runOriginalWorkflow(workflowPath, prompt, imageName);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // 이미지를 uploads 폴더에 저장
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `generated_${Date.now()}.png`;
    const imagePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(imagePath, result.imageData);
    console.log(`생성된 이미지 저장 완료: ${imagePath}`);
    
    return {
      success: true,
      imageUrl: `/uploads/${filename}`,
      localPath: imagePath
    };
    
  } catch (error) {
    console.error('ComfyUI 이미지 생성 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 범용 워크플로우 연결 복구 시스템
const createUniversalConnectionSystem = (workflow) => {
  console.log('범용 워크플로우 연결 복구 시스템 시작...');
  
  // 모든 노드의 출력 타입 분석
  const nodeOutputs = {};
  const nodeInputRequirements = {};
  
  for (const [nodeId, nodeData] of Object.entries(workflow)) {
    const classType = nodeData.class_type;
    
    // 각 노드 타입별 출력 정의
    switch (classType) {
      case 'CheckpointLoaderSimple':
        nodeOutputs[nodeId] = { model: 0, clip: 1, vae: 2 };
        break;
      case 'LoraLoader':
        nodeOutputs[nodeId] = { model: 0, clip: 1 };
        break;
      case 'VAELoader':
        nodeOutputs[nodeId] = { vae: 0 };
        break;
      case 'CLIPLoader':
        nodeOutputs[nodeId] = { clip: 0 };
        break;
      case 'CLIPSetLastLayer':
        nodeOutputs[nodeId] = { clip: 0 };
        break;
      case 'CLIPTextEncode':
        nodeOutputs[nodeId] = { conditioning: 0 };
        break;
      case 'EmptyLatentImage':
        nodeOutputs[nodeId] = { latent: 0 };
        break;
      case 'LoadImage':
        nodeOutputs[nodeId] = { image: 0, mask: 1 };
        break;
      case 'IPAdapterUnifiedLoaderFaceID':
        nodeOutputs[nodeId] = { model: 0, ipadapter: 1 };
        break;
      case 'IPAdapterFaceID':
        nodeOutputs[nodeId] = { model: 0 };
        break;
      case 'FreeU_V2':
        nodeOutputs[nodeId] = { model: 0 };
        break;
      case 'BasicScheduler':
        nodeOutputs[nodeId] = { sigmas: 0 };
        break;
      case 'SplitSigmas':
        nodeOutputs[nodeId] = { sigmas_1: 0, sigmas_2: 1 };
        break;
      case 'KSamplerSelect':
        nodeOutputs[nodeId] = { sampler: 0 };
        break;
      case 'DetailDaemonSamplerNode':
        nodeOutputs[nodeId] = { sampler: 0 };
        break;
      case 'SamplerCustom':
        nodeOutputs[nodeId] = { latent: 0, denoised: 1 };
        break;
      case 'KSampler':
        nodeOutputs[nodeId] = { latent: 0 };
        break;
      case 'LatentUpscaleBy':
        nodeOutputs[nodeId] = { latent: 0 };
        break;
      case 'VAEDecodeTiled':
      case 'VAEDecode':
        nodeOutputs[nodeId] = { image: 0 };
        break;
    }
    
    // 각 노드 타입별 입력 요구사항 정의
    switch (classType) {
      case 'CLIPTextEncode':
        nodeInputRequirements[nodeId] = { clip: 'clip' };
        break;
      case 'LoraLoader':
        nodeInputRequirements[nodeId] = { model: 'model', clip: 'clip' };
        break;
      case 'CLIPSetLastLayer':
        nodeInputRequirements[nodeId] = { clip: 'clip' };
        break;
      case 'FreeU_V2':
        nodeInputRequirements[nodeId] = { model: 'model' };
        break;
      case 'IPAdapterUnifiedLoaderFaceID':
        nodeInputRequirements[nodeId] = { model: 'model' };
        break;
      case 'IPAdapterFaceID':
        nodeInputRequirements[nodeId] = { model: 'model', ipadapter: 'ipadapter', image: 'image' };
        break;
      case 'BasicScheduler':
        nodeInputRequirements[nodeId] = { model: 'model' };
        break;
      case 'SplitSigmas':
        nodeInputRequirements[nodeId] = { sigmas: 'sigmas' };
        break;
      case 'SamplerCustom':
        nodeInputRequirements[nodeId] = { 
          model: 'model', 
          positive: 'conditioning', 
          negative: 'conditioning',
          sampler: 'sampler',
          sigmas: 'sigmas',
          latent_image: 'latent'
        };
        break;
      case 'KSampler':
        nodeInputRequirements[nodeId] = { 
          model: 'model', 
          positive: 'conditioning', 
          negative: 'conditioning',
          latent_image: 'latent'
        };
        break;
      case 'LatentUpscaleBy':
        nodeInputRequirements[nodeId] = { samples: 'latent' };
        break;
      case 'VAEDecodeTiled':
      case 'VAEDecode':
        nodeInputRequirements[nodeId] = { samples: 'latent', vae: 'vae' };
        break;
      case 'SaveImage':
        nodeInputRequirements[nodeId] = { images: 'image' };
        break;
      case 'DetailDaemonSamplerNode':
        nodeInputRequirements[nodeId] = { sampler: 'sampler' };
        break;
    }
  }
  
  // Anything Everywhere 노드들 찾기
  const anythingEverywhereNodes = {};
  for (const [nodeId, nodeData] of Object.entries(workflow)) {
    if (nodeData.class_type === 'Anything Everywhere3' || 
        nodeData.class_type === 'Anything Everywhere' ||
        nodeData.class_type === 'Prompts Everywhere') {
      anythingEverywhereNodes[nodeId] = nodeData;
    }
  }
  
  // 자동 연결 복구
  for (const [nodeId, requirements] of Object.entries(nodeInputRequirements)) {
    const node = workflow[nodeId];
    if (!node) continue;
    
    for (const [inputName, requiredType] of Object.entries(requirements)) {
      // 이미 연결되어 있으면 건너뛰기
      if (node.inputs[inputName] && Array.isArray(node.inputs[inputName])) {
        continue;
      }
      
      // 적절한 출력 노드 찾기
      let bestConnection = null;
      
      // 특별한 매핑 (프롬프트의 경우)
      if (requiredType === 'conditioning') {
        if (inputName === 'positive') {
          // 긍정 프롬프트 찾기
          for (const [sourceId, sourceData] of Object.entries(workflow)) {
            if (sourceData.class_type === 'CLIPTextEncode' && 
                sourceData.inputs.text && 
                !sourceData.inputs.text.toLowerCase().includes('worst quality')) {
              bestConnection = [sourceId, 0];
              break;
            }
          }
        } else if (inputName === 'negative') {
          // 부정 프롬프트 찾기
          for (const [sourceId, sourceData] of Object.entries(workflow)) {
            if (sourceData.class_type === 'CLIPTextEncode' && 
                sourceData.inputs.text && 
                sourceData.inputs.text.toLowerCase().includes('worst quality')) {
              bestConnection = [sourceId, 0];
              break;
            }
          }
        }
      } else {
        // 일반적인 타입 매칭
        for (const [sourceId, outputs] of Object.entries(nodeOutputs)) {
          if (outputs[requiredType] !== undefined) {
            bestConnection = [sourceId, outputs[requiredType]];
            break;
          }
        }
      }
      
      if (bestConnection) {
        node.inputs[inputName] = bestConnection;
        console.log(`자동 연결: 노드 ${nodeId}.${inputName} <- 노드 ${bestConnection[0]}.${bestConnection[1]}`);
      }
    }
  }
  
  console.log('범용 워크플로우 연결 복구 완료');
};

module.exports = {
  customizeWorkflow,
  runComfyWorkflow,
  runOriginalWorkflow,
  generateImageWithComfyUI
}; 