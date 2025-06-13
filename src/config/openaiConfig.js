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
 * 일기 내용을 바탕으로 이미지 생성 프롬프트 생성 함수 (인물 정보 포함)
 * @param {string} diaryContent - 일기 내용
 * @param {string} artStyle - 화풍 (Makoto Shinkai, Anime, Realistic 등)
 * @param {Object} userInfo - 사용자 인물 정보 (성별, 의상, 헤어스타일 등)
 * @returns {Promise<string>} - 생성된 이미지 프롬프트 (콤마로 구분)
 */
const generateImagePrompt = async (diaryContent, artStyle = 'Makoto Shinkai', userInfo = {}) => {
  try {
    // 기본 인물 정보 설정
    const defaultUserInfo = {
      gender: '기타',
      clothing: '',
      hairstyle: '',
      accessories: '',
      appearance: '',
      ...userInfo
    };

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

              중요 요구사항:
              1. 인물 정보 필수 포함: 주인공의 성별, 의상, 헤어스타일, 악세사리 등을 반드시 포함
              2. 콤마로 구분된 키워드 형식으로 출력
              3. 화풍에 맞는 스타일 키워드 포함
              
              포함할 요소 (순서대로):
              
              1. 인물 정보 (필수, 맨 앞에 위치):
                 - 성별에 따른 인물 표현
                 - 의상 정보 (구체적으로)
                 - 헤어스타일 정보
                 - 악세사리 정보
                 - 기타 외모 특징
              
              2. 장면 및 행동:
                 - 일기 내용에서 언급된 주요 장면
                 - 인물의 행동이나 활동
              
              3. 배경 및 환경:
                 - 장소 (예: park, cafe, room, street)
                 - 시간대 (예: morning, afternoon, evening, night)
                 - 날씨나 분위기
              
              4. 화풍 및 품질 키워드:
                 - 선택된 화풍에 맞는 스타일 키워드
                 - 품질 관련 키워드 (high quality, detailed, masterpiece 등)
              
              화풍별 키워드:
              - Makoto Shinkai: "makoto shinkai style, anime, detailed background, cinematic lighting, beautiful colors"
              - Anime: "anime style, manga style, cel shading, vibrant colors"
              - Realistic: "realistic, photorealistic, high detail, natural lighting"
              - Watercolor: "watercolor painting, soft colors, artistic, traditional art"
              - Oil Painting: "oil painting, classical art, painterly, rich colors"
              
              출력 형식:
              - 콤마로 구분된 키워드들
              - 영어로만 작성
              - 인물 정보가 맨 앞에 오도록 구성
              - 예시: "young woman, casual dress, long black hair, sitting in cafe, afternoon, warm lighting, makoto shinkai style, high quality"`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `일기 내용: ${diaryContent}

              인물 정보:
              - 성별: ${defaultUserInfo.gender}
              - 의상: ${defaultUserInfo.clothing}
              - 헤어스타일: ${defaultUserInfo.hairstyle}
              - 악세사리: ${defaultUserInfo.accessories}
              - 외모 특징: ${defaultUserInfo.appearance}
              
              화풍: ${artStyle}`
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
    let imagePrompt = response.output_text.trim();
    console.log('OpenAI로부터 생성된 원본 프롬프트:', imagePrompt.substring(0, 100) + '...');
    
    if (!imagePrompt || imagePrompt === '') {
      throw new Error('OpenAI가 빈 프롬프트를 반환했습니다');
    }
    
    // 콤마로 구분된 형식인지 확인하고, 아니면 기본 형식으로 변환
    if (!imagePrompt.includes(',')) {
      // 기본 프롬프트 구성
      const genderMap = {
        '남성': 'young man',
        '여성': 'young woman',
        '기타': 'person'
      };
      
      const personDesc = genderMap[defaultUserInfo.gender] || 'person';
      const styleMap = {
        'Makoto Shinkai': 'makoto shinkai style, anime, detailed background, cinematic lighting',
        'Anime': 'anime style, manga style, cel shading, vibrant colors',
        'Realistic': 'realistic, photorealistic, high detail, natural lighting',
        'Watercolor': 'watercolor painting, soft colors, artistic',
        'Oil Painting': 'oil painting, classical art, painterly'
      };
      
      imagePrompt = [
        personDesc,
        defaultUserInfo.clothing,
        defaultUserInfo.hairstyle,
        defaultUserInfo.accessories,
        'beautiful scene',
        styleMap[artStyle] || styleMap['Makoto Shinkai'],
        'high quality, detailed, masterpiece'
      ].filter(item => item && item.trim() !== '').join(', ');
    }
    
    return imagePrompt;
  } catch (error) {
    console.error('이미지 프롬프트 생성 오류:', error);
    
    // 기본 프롬프트 반환 (인물 정보 포함)
    const genderMap = {
      '남성': 'young man',
      '여성': 'young woman', 
      '기타': 'person'
    };
    
    const personDesc = genderMap[userInfo.gender] || 'person';
    const styleKeywords = artStyle === 'Makoto Shinkai' ? 
      'makoto shinkai style, anime, detailed background, cinematic lighting' :
      'high quality, detailed, beautiful';
      
    return `${personDesc}, ${userInfo.clothing || 'casual clothes'}, ${userInfo.hairstyle || 'natural hair'}, beautiful scene, ${styleKeywords}, masterpiece`;
  }
};

module.exports = { analyzeDiaryContent, generateImagePrompt }; 