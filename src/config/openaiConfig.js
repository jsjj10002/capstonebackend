const fs = require('fs');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 일기 내용과 주인공 정보를 바탕으로 ComfyUI용 이미지 생성 프롬프트 생성
 * @param {string} diaryContent - 일기 내용
 * @param {string} characterDescription - 주인공 특징 설명 (예: "1man, short hair, casual clothes")
 * @returns {Promise<string>} - 생성된 이미지 프롬프트
 */
const generateImagePrompt = async (diaryContent, characterDescription = '') => {
  try {
    const response = await openai.responses.create({
      model: "o4-mini",
      input: [
        {
          "role": "developer",
          "content": [
            {
              "type": "input_text",
              "text": `목표: 일기 내용을 바탕으로 ComfyUI/Stable Diffusion용 이미지 생성 프롬프트를 만듭니다.

              요구사항:
              1. 일기 내용에서 장소, 시간, 활동, 분위기를 파악
              2. 주인공 정보가 제공되면 반드시 포함
              3. 영어 키워드를 콤마로 구분하여 작성
              4. 한 장면만 묘사 (여러 장면 금지)
              5. 고품질 키워드로 마무리 (masterpiece, best quality 등)
              
              출력 형식:
              - 영어 키워드만 사용, 콤마로 구분
              - 예: 1man, short hair, sitting, cafe, afternoon, warm lighting, masterpiece, best quality
              
              주의사항:
              - 한국어 절대 금지
              - 문장 형태 금지, 키워드만 사용
              - NSFW 내용 금지`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `일기 내용: ${diaryContent}
              
              주인공 정보: ${characterDescription || '정보 없음'}`
            }
          ]
        }
      ],
      text: {
        "format": {
          "type": "text"
        }
      },
      reasoning: {
        "effort": "high"
      },
      tools: [],
      store: true
    });

    const imagePrompt = response.output_text.trim();
    
    if (!imagePrompt) {
      throw new Error('OpenAI가 빈 프롬프트를 반환했습니다');
    }
    
    return imagePrompt;
  } catch (error) {
    console.error('이미지 프롬프트 생성 오류:', error);
    // 기본 프롬프트 반환
    const fallbackPrompt = characterDescription 
      ? `${characterDescription}, beautiful scene, natural lighting, masterpiece, best quality`
      : 'beautiful landscape, natural lighting, masterpiece, best quality';
    return fallbackPrompt;
  }
};

module.exports = { generateImagePrompt }; 