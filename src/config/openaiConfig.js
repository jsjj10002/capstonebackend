const fs = require('fs');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * 일기 내용을 바탕으로 이미지 생성 프롬프트 생성 함수
 * @param {string} diaryTitle - 일기 제목
 * @param {string} diaryContent - 일기 내용
 * @param {Array<string>} diaryTags - 일기 태그
 * @param {string} diaryMood - 일기 무드
 * @returns {Promise<string>} - 생성된 이미지 프롬프트
 */
const generateImagePrompt = async (diaryTitle, diaryContent, diaryTags, diaryMood) => {
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
              "text": `목표: 주어진 일기 내용을 바탕으로 Stable Diffusion에 사용할 이미지 생성 프롬프트를 만듭니다.

              분석 및 포함할 요소:
              
              1. 시간 및 장소 (필수):
                 - 일기 태그와 내용에서 언급된 시간 (예: 아침, 오후, 저녁, 밤)을 반영
                 - 일기 태그와 내용에서 언급된 장소 (예: 공원, 카페, 사무실)를 반영
              
              2. 장면 묘사 (필수):
                 - 일기에서 언급된 주요 장면과 환경 묘사
                 - 인물이 포함된 경우에도 얼굴이나 개인적 특징은 묘사하지 않고 장면만 중심으로 표현
              
              3. 행동/활동 (필수):
                 - 일기 태그와 내용에서 언급된 활동이나 행동 (예: 산책, 식사, 독서)을 반영
                 - 자연스러운 장면으로 묘사
              
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
              - 인물의 얼굴 특징은 포함하지 마세요. 인물이 포함된 경우 뒷모습이나 실루엣으로 묘사하세요.
              - 프롬프트는 쉼표로 구분된 키워드 형식보다는 자연스러운 영어 문장으로 작성해주세요.
              - 항상 사실적인 사진 스타일로 마무리하세요.
              
              출력 형식:
              - 스테이블 디퓨전에 바로 입력할 수 있는 서술형 영어 프롬프트로 작성
              - 영어로 작성하며, 글자수 제한 없음
              - 한국어를 포함하지 않음`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `일기 제목: ${diaryTitle}
              
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
    console.log('OpenAI로부터 생성된 원본 프롬프트:', imagePrompt.substring(0, 100) + '...');
    
    if (!imagePrompt || imagePrompt.trim() === '') {
      throw new Error('OpenAI가 빈 프롬프트를 반환했습니다');
    }
    
    return imagePrompt;
  } catch (error) {
    console.error('이미지 프롬프트 생성 오류:', error);
    // 기본 프롬프트 반환
    return 'A beautiful landscape with natural lighting, realistic photo, high quality.';
  }
};

module.exports = { analyzeDiaryContent, generateImagePrompt }; 