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
    const response = await openai.chat.completions.create({
      model: "o4-mini",
      input: [
        {
          "role": "developer",
          "content": [
            {
                "type": "input_text",
                "text": "Create a detailed prompt suitable for stable diffusion, by analyzing a given photo and generating a descriptive sentence that aims to recreate an image closely resembling the original photo.\n\n- Include detailed descriptions of the following elements in the prompt:\n  - Facial features: shape, size, color, and position of eyes, nose, and mouth\n  - Hairstyle: length, color\n  - Skin tone and facial shape characteristics: contour and outline\n  - Gender, race, age\n\n- If there's additional text describing style or action accompanying the photo, incorporate it into the prompt.\n\n# Steps\n\n1. Analyze the facial features visible in the photo, and describe each element in detail.\n2. Observe and characterize the hairstyle, skin tone, and facial shape.\n3. Estimate and include the person's gender, race, and age.\n4. If there is information on art style or action, incorporate this into a comprehensive sentence.\n\n# Output Format\n\nProvide the prompt as a detailed and precise text sentence, which can be used for stable diffusion purposes."
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
      resoning: {
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

module.exports = { analyzeImageFeatures }; 