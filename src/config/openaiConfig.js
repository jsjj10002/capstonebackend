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
 * @param {Array<string>} requiredKeywords - 화풍별 필수 키워드
 * @returns {Promise<string>} - 생성된 이미지 프롬프트
 */
const generateImagePrompt = async (diaryContent, characterDescription = '', requiredKeywords = []) => {
  // 기본 프롬프트 반환 (필수 키워드 포함)
  const requiredKeywordsText = requiredKeywords.length > 0 ? requiredKeywords.join(', ') : '없음';
  try {
    const response = await openai.responses.create({
      model: "o4-mini",
      input: [
        {
          "role": "developer",
          "content": [
            {
              "type": "input_text",
              "text": `Create a structured image generation prompt in English for ComfyUI/Stable Diffusion based on a diary entry.

Ensure all features and guidelines for prompt creation are considered and followed.

### Part I: Prompt Writing Basic Rules

- **Write in English**: Use English exclusively as CLIP models are trained on English datasets.
- **Use Phrases**: Utilize phrases instead of full sentences, separated by commas for easy management and weight adjustment.
- **Annotation Support**: Supports single-line comments with \`//\` and multi-line comments with \`/* ... */\`.
- **Weight Management**: Influences image generation based on list position, with higher weights for items listed first.

### Part II: Comfy UI Prompt Weight Rules and Syntax

- **Weight Expression**: Use parentheses to add weights to prompts, e.g., (Prompt: 1.5), advisable to keep within 0.5 to 1.5.
- **Quick Weight Adjustment**: Adjust weights using Ctrl and arrow keys for key phrases.
- **Weight Reduction Method**: Use brackets \`[]\` for decreasing weights, though less effective in Comfy UI.
- **Random Generation**: Use \`{Prompt|Prompt|Prompt}\` to introduce randomness in generated images.

### Part III: Structured Prompt Writing Guidelines and Recommended Tools

- **Components**: Subject, Features, Environment/Background, Style, Modifiers should all be considered.

### Requirements

1. Identify and extract place, time, activity, and mood from the diary content.
2. Include protagonist information if provided or implied by entries tagged with "@".
3. Use English keywords separated by commas.
4. Describe only one scene (avoid multiple scenes).
5. Emphasize facial features to ensure the image centers around the subject's face.
6. Conclude with high-quality keywords (e.g., masterpiece, best quality).
7. Specify "1 male" or "1 woman" to clearly indicate a singular protagonist focus.

### Output Format

- **Format**: Only use English keywords, separated by commas.
- **Example**: \`1man, short hair, sitting, cafe, afternoon, warm lighting, masterpiece, best quality\`

### Cautions

- Korean language is strictly prohibited.
- Sentence forms are prohibited; use only keywords.
- NSFW content is prohibited.
- Ensure the prompt captures only one protagonist as the main focus.

### Notes

- Emphasize the use of structured and phased keyword placement for effective weight adjustment.
- Ensure generated images feature a prominent focus on facial depiction.
- Utilize the guidelines to maximize the descriptive and visual attributes of the generated image.
- The protagonist of the image is the diary's author unless another person is marked with "@".`
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `일기 내용: ${diaryContent}
              
주인공 정보: ${characterDescription || '정보 없음'}

프롬프트 맨 앞에 무조건 위치해야하는 단어들: ${requiredKeywordsText}`

              
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
        "effort": "medium"
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
    // 기본 프롬프트 반환 (필수 키워드 포함)
    const fallbackPrompt = characterDescription 
      ? `${requiredKeywords.length > 0 ? requiredKeywords.join(', ') + ', ' : ''}${characterDescription}, beautiful scene, natural lighting, masterpiece, best quality`
      : `${requiredKeywords.length > 0 ? requiredKeywords.join(', ') + ', ' : ''}beautiful landscape, natural lighting, masterpiece, best quality`;
    return fallbackPrompt;
  }
};

module.exports = { generateImagePrompt }; 