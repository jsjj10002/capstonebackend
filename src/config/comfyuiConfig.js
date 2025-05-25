// axios 대신 node의 기본 fetch API 사용
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const fetch = require('node-fetch');

// 워크플로우 커스터마이징 함수
const customizeWorkflow = (workflow, { prompt, imagePath }) => {
  console.log('워크플로우 커스터마이징 시작...');
  const modifiedWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // 워크플로우에 모든 필요한 노드가 있는지 확인
  const requiredNodes = ['46', '54', '56', '51'];
  let missingNodes = [];
  
  for (const nodeId of requiredNodes) {
    if (!modifiedWorkflow[nodeId]) {
      missingNodes.push(nodeId);
    }
  }
  
  if (missingNodes.length > 0) {
    console.error(`워크플로우에 필수 노드가 없습니다: ${missingNodes.join(', ')}`);
    console.log('워크플로우에 있는 노드:', Object.keys(modifiedWorkflow).join(', '));
  }
  
  // 입력 이미지 경로 수정 (프로필 사진)
  if (modifiedWorkflow['46']) {
    // 경로에서 파일 이름만 추출 (OS 호환성을 위해 path 모듈 사용)
    const path = require('path');
    const fs = require('fs'); 
    
    // 파일 존재 확인
    if (!fs.existsSync(imagePath)) {
      console.error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
    } else {
      console.log(`이미지 파일 확인됨: ${imagePath} (${fs.statSync(imagePath).size} 바이트)`);
    }
    
    // 이미지 경로 설정
    modifiedWorkflow['46'].inputs.image = imagePath;
    console.log(`이미지 경로 설정 완료: ${imagePath}`);
    
    // Node 46의 class_type 확인
    console.log(`노드 46 타입: ${modifiedWorkflow['46'].class_type}`);
  } else {
    console.error('이미지 로드 노드(46)가 없어 프로필 사진을 설정할 수 없습니다.');
  }
  
  // 프롬프트 텍스트 설정
  if (modifiedWorkflow['54']) {
    modifiedWorkflow['54'].inputs.text = prompt;
    console.log(`노드 54에 프롬프트 설정 완료 (${prompt.length}자)`);
    console.log('프롬프트 미리보기:', prompt.substring(0, 100) + '...');
  } else {
    console.error('텍스트 인코딩 노드(54)가 없어 프롬프트를 설정할 수 없습니다.');
  }
  
  if (modifiedWorkflow['56']) {
    modifiedWorkflow['56'].inputs.text = prompt;
    console.log(`노드 56에 프롬프트 설정 완료 (${prompt.length}자)`);
  } else {
    console.error('텍스트 인코딩 노드(56)가 없어 프롬프트를 설정할 수 없습니다.');
  }
  
  // 랜덤 시드 생성
  const seed1 = Math.floor(Math.random() * 1000000000000000);
  const seed2 = Math.floor(Math.random() * 1000000000000000);
  
  if (modifiedWorkflow['50']) {
    modifiedWorkflow['50'].inputs.seed = seed1;
    console.log(`KSampler 노드(50)에 시드 설정: ${seed1}`);
  } else {
    console.error('KSampler 노드(50)가 없어 시드를 설정할 수 없습니다.');
  }
  
  if (modifiedWorkflow['58']) {
    modifiedWorkflow['58'].inputs.seed = seed2;
    console.log(`KSampler 노드(58)에 시드 설정: ${seed2}`);
  } else {
    console.error('KSampler 노드(58)가 없어 시드를 설정할 수 없습니다.');
  }
  
  // SaveImage 노드 설정 확인
  if (modifiedWorkflow['51']) {
    console.log(`SaveImage 노드 설정: ${JSON.stringify(modifiedWorkflow['51'].inputs)}`);
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

module.exports = {
  customizeWorkflow,
  runComfyWorkflow
}; 