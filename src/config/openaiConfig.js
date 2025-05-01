const fs = require('fs');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 이미지 파일의 특징을 분석하는 함수
 * @param {string} imagePath - 이미지 파일 경로
 * @returns {Promise<string>} - 분석된 이미지 특징 텍스트
 */
const analyzeImageFeatures = async (imagePath) => {
  try {
    // 이미지 파일을 base64로 인코딩
    const base64Image = fs.readFileSync(imagePath, 'base64');

    // OpenAI API 호출
    const response = await openai.responses.create({
      model: "o4-mini",
      input: [
        {
          "role": "developer",
          "content": [
            {
                "type": "input_text",
                "text": `목표: 주어진 사진을 분석하여 Stable Diffusion 이미지 생성에 사용할 상세 키워드 목록을 한국어로 생성합니다.

                분석 및 포함할 요소:
                
                얼굴 특징:
                
                눈: 모양 (예: 아몬드형, 둥근형), 크기, 색, 위치, 눈꼬리 각도, 쌍꺼풀 유무, 눈 사이 거리 (미간 거리)
                
                코: 모양 (예: 직선형, 매부리코), 크기 (높이, 너비), 콧대 각도, 콧볼 모양
                
                입: 모양, 두께, 입꼬리 각도, 표정 (예: 미소, 무표정), 치아 노출 여부
                
                헤어스타일:
                
                길이: 구체적인 길이 묘사 및 수치적 근사치 (예: 턱선 길이 (약 20cm), 어깨 넘는 길이 (약 40cm))
                
                색상: (예: 자연 갈색, 검은색, 금발)
                
                스타일: (예: 직모, 웨이브, 곱슬, 묶음 머리, 스파이크)
                
                앞머리: 유무 및 스타일 (예: 앞머리 없음, 시스루뱅, 풀뱅)
                
                피부톤 및 얼굴형:
                
                피부 색조: (예: 밝은 웜톤, 어두운 쿨톤, 중간톤)
                
                얼굴 윤곽: (예: 계란형, 둥근형, 각진형, V라인), 턱선 모양 (예: 뾰족한 턱, 사각턱)
                
                기본 정보:
                
                성별: (예: 남성, 여성)
                
                인종: (예: 동양인, 서양인, 흑인)
                
                추정 연령대: (예: 10대 후반, 30대 중반, 50대)
                
                액세서리: 착용하고 있는 액세서리 (예: 안경 (모양, 색상), 귀걸이, 목걸이, 모자)
                
                스타일/액션 (추가 텍스트 정보가 있는 경우): 사진과 함께 제공된 아트 스타일 (예: 사실적인, 유화, 애니메이션 스타일)이나 인물의 행동/포즈 (예: 웃고 있는, 옆모습, 손 흔드는)에 대한 설명이 있다면 해당 키워드도 포함합니다.
                
                출력 형식:
                
                분석된 모든 특징을 나타내는 한국어 키워드들을 **쉼표(,)**로 구분하여 나열합니다.
                
                완전한 문장이 아닌, 단어 또는 짧은 구 형태의 키워드 목록으로 제공해야 합니다. (예: 성인 남성, 40대 초반, 둥근 얼굴, 부드러운 턱선, 따뜻한 흰 피부톤, 약간의 수염 자국, 짧고 촘촘한 검은색 스파이크 헤어 (약 5cm), 앞머리 없음, 가늘고 약간 올라간 아몬드 모양의 짙은 갈색 눈, 넓고 부드러운 윤곽의 코, 치아가 보이며 입술이 벌어진 넓은 미소, 웃는 모습, 안경 미착용, 맞춤 네이비 블루 수트 재킷, 같은 색 조끼, 깔끔한 흰색 드레스 셔츠, 포켓 스퀘어, 웃는 도중 입 근처로 올린 오른손, 공식 행사, 밝고 균일한 조명, 부드러운 초점의 홍보 패널 배경, 사실적인 스타일)`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            
            
            {
              "type": "input_image",
              "image_url": `data:image/png;base64,${base64Image}`
            }
          ]
        }
      ],
      text:{
        "format":{
            "type": "text"
        }
      },
      reasoning: {
        "effort": "high"
      },
      tools: [],
      store: true
    });

    // 응답에서 생성된 텍스트 추출
    const features = response.output_text;
    return features;
  } catch (error) {
    console.error('이미지 분석 오류:', error);
    return '이미지 분석에 실패했습니다.';
  }
};

/**
 * 일기 내용을 분석하여 태그와 무드를 추출하는 함수
 * @param {string} title - 일기 제목
 * @param {string} content - 일기 내용
 * @returns {Promise<Object>} - 분석된 태그와 무드 정보
 */
const analyzeDiaryContent = async (title, content) => {
  try {
    // OpenAI API 호출
    const response = await openai.responses.create({
      model: "o4-mini",
      input: [
        {
          "role": "developer",
          "content": [
            {
              "type": "input_text",
              "text": `목표: 주어진 일기의 제목과 내용을 분석하여 관련 태그와 무드를 한국어로 추출합니다.

              분석 및 포함할 요소:
              
              태그 (tags):
              - 장소: 일기에 언급된 장소 (예: 카페, 학교, 공원, 집, 회사)
              - 시간대: 일기에 언급된 시간대 (예: 아침, 오후, 저녁, 밤, 주말)
              - 활동: 일기에 언급된 주요 활동 (예: 공부, 운동, 쇼핑, 여행, 식사)
              - 인물: 일기에 언급된 인물 관계 (예: 친구, 가족, 연인, 동료)
              - 이벤트: 일기에 언급된 특별한 이벤트 (예: 생일, 여행, 시험, 모임)
              - 날씨: 일기에 언급된 날씨 상태 (예: 맑음, 비, 눈, 구름)
              
              무드 (mood):
              - 감정 상태: 일기에서 표현된 주요 감정 (예: 행복, 슬픔, 화남, 불안, 평온, 흥분, 지침)
              - 정서적 분위기: 일기 전체에서 느껴지는 분위기 (예: 긍정적, 부정적, 중립적, 혼란스러움)
              
              출력 형식:
              JSON 형태로 아래와 같이 출력합니다:
              {
                "tags": ["태그1", "태그2", "태그3", ...],
                "mood": "주요 감정 상태"
              }
              
              분석된 모든 태그는 단어 또는 짧은 구 형태로 제공하고, 무드는 가장 두드러진 하나의 감정 상태만 선택합니다.`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `제목: ${title}\n\n내용: ${content}`
            }
          ]
        }
      ],
      text:{
        "format":{
            "type": "text"
        }
      },
      reasoning: {
        "effort": "high"
      },
      tools: [],
      store: true
    });

    // 응답에서 생성된 텍스트 추출 및 JSON 파싱
    const analysisResult = JSON.parse(response.output_text);
    return analysisResult;
  } catch (error) {
    console.error('일기 내용 분석 오류:', error);
    return {
      tags: [],
      mood: '알 수 없음'
    };
  }
};

/**
 * 일기 내용과 사용자 프로필을 바탕으로 이미지 생성 프롬프트 생성 함수
 * @param {string} profileFeatures - 사용자 프로필 사진 특성
 * @param {string} diaryTitle - 일기 제목
 * @param {string} diaryContent - 일기 내용
 * @param {Array<string>} diaryTags - 일기 태그
 * @param {string} diaryMood - 일기 무드
 * @returns {Promise<string>} - 생성된 이미지 프롬프트
 */
const generateImagePrompt = async (profileFeatures, diaryTitle, diaryContent, diaryTags, diaryMood) => {
  try {
    // OpenAI API 호출
    const response = await openai.responses.create({
      model: "o4-mini",
      input: [
        {
          "role": "developer",
          "content": [
            {
              "type": "input_text",
              "text": `목표: 주어진 사용자 프로필(외모) 특성과 일기 내용을 바탕으로 Stable Diffusion에 사용할 이미지 생성 프롬프트를 만듭니다.

              분석 및 포함할 요소:
              
              1. 인물 묘사 (최우선):
                 - 프로필 특성에 기술된 모든 외모 특징을 빠짐없이 반드시 포함해야 합니다.
                 - 성별, 나이, 인종, 얼굴형, 피부색, 머리 스타일, 눈, 코, 입 등 자세한 외모 특징을 하나도 빠트리지 않고 모두 포함
                 - 제공된 프로필 특징 목록의 모든 요소를 반드시 프롬프트에 반영
              
              2. 시간 및 장소 (필수):
                 - 일기 태그와 내용에서 언급된 시간 (예: 아침, 오후, 저녁, 밤)을 반영
                 - 일기 태그와 내용에서 언급된 장소 (예: 공원, 카페, 사무실)를 반영
              
              3. 행동/활동 (필수):
                 - 일기 태그와 내용에서 언급된 활동이나 행동 (예: 산책, 식사, 독서)을 반영
                 - 인물이 수행하는 자연스러운 행동으로 묘사
              
              4. 분위기/감정 (필수):
                 - 일기의 mood와 내용에서 느껴지는 감정 상태를 반영
              
              5. 배경 및 환경 (필수):
                 - 시간과 장소에 어울리는 자연스러운 배경 묘사
                 - 날씨, 조명 등의 환경 요소 포함
              
              6. 스타일 지정 (필수):
                 - 사실적인 사진 스타일, 고품질, 자연스러운 구도
                 - "realistic photo, high quality, natural composition, good lighting" 등의 스타일 지정자 포함
              
              중요 제약조건:
              - 일기 내용을 고려하여 한 장면만 묘사해야 합니다 (여러 장면이나 시퀀스가 아닌).
              - 가장 중요하고 시각적으로 구현 가능한 장면을 선택하세요.
              - 인물의 모든 외모 특징을 반드시 빠짐없이 포함하세요.
              - 프롬프트는 쉼표로 구분된 키워드 형식보다는 자연스러운 영어 문장으로 작성해주세요.
              - 항상 사실적인 사진 스타일로 마무리하세요.
              
              출력 형식:
              - 스테이블 디퓨전에 바로 입력할 수 있는 서술형 영어 프롬프트로 작성
              - 영어로 작성하며, 글자수 제한 없음
              - 모든 프로필 특징이 빠짐없이 포함되어야 함
              - 한국어를 포함하지 않음`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `프로필 특성: ${profileFeatures}
              
              일기 제목: ${diaryTitle}
              
              일기 내용: ${diaryContent}
              
              일기 태그: ${diaryTags.join(', ')}
              
              무드: ${diaryMood}`
            }
          ]
        }
      ],
      text:{
        "format":{
            "type": "text"
        }
      },
      reasoning: {
        "effort": "high"
      },
      tools: [],
      store: true
    });

    // 응답에서 생성된 텍스트 추출
    const imagePrompt = response.output_text;
    return imagePrompt;
  } catch (error) {
    console.error('이미지 프롬프트 생성 오류:', error);
    return '이미지 프롬프트 생성에 실패했습니다.';
  }
};

module.exports = { analyzeImageFeatures, analyzeDiaryContent, generateImagePrompt }; 