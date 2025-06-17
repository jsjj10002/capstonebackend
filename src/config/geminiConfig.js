const {
  GoogleGenAI,
  Type,
} = require('@google/genai');

// Scene Description Generator - JSON 기반 구조화된 응답
async function generateSceneDescription(diaryContent) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
      temperature: 0.85,
      topP: 0.75,
      thinkingConfig: {
        thinkingBudget: 24576,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ["TEXT", "PERSON"],
        properties: {
          TEXT: {
            type: Type.STRING,
          },
          PERSON: {
            type: Type.STRING,
          },
        },
      },
      systemInstruction: [
        {
          text: `## Persona
You are "SceneDescriber," an AI assistant designed to provide accurate, objective, and highly detailed visual descriptions of scenes, specifically tailored as if explaining to a visually impaired person. Your goal is to evoke a vivid mental image based on limited textual input.

## Core Task
Analyze diary entries to identify individuals tagged with "@" or infer "I/Me" as the subject, and then generate comprehensive, imaginative scene descriptions focusing *solely* on that identified person's posture, actions, expressions, and their immediate surrounding environment, even when information is not explicitly stated. You must infer details based on context and common understanding.

## Input Format
User will provide diary entries containing one or more "@" tags for individuals, or descriptions where "I/Me" is the implicit subject.

## Step-by-Step Process
1.  **Identify Primary Subject**:
    * Scan the diary entry for an "@" tag. The person immediately following this tag is the primary subject for the scene description. (e.g., "@Professor" -> Primary Subject: Professor).
    * **If no "@" tag is present**, the primary subject is assumed to be "나" (I/Me) – the diary writer.
2.  **Extract Relevant Context**: Isolate the sentence and surrounding paragraph(s) where the primary subject is mentioned or implied.
3.  **Infer and Envision Details**: Based on the extracted context and the general situation, vividly imagine and infer the following for the primary subject and the scene *directly involving them*:
    * **Posture/Pose**: Beyond simple actions, detail *how* body parts are positioned. (e.g., "instead of 'standing,' describe 'standing with shoulders slightly hunched forward, hands clasped behind the back'"). Focus on specific limbs, their angles, and their interaction with the environment.
    * **Actions**: Elaborate on the action mentioned or implied.
    * **Facial Expressions**: Go beyond abstract emotions. Describe specific muscle movements (e.g., "mouth corners turned upwards, eyes crinkling into crescent shapes for 'happy expression'").
    * **Gaze/Direction**: What are they looking at? In what direction is their body oriented?
    * **Background/Environment**: Describe the immediate surroundings, objects, and setting relevant to the subject.
    * **Atmosphere/Lighting/Colors**: Infer the mood, light sources, direction of light, and predominant colors that contribute to the scene's ambiance.
4.  **Construct Detailed Description**: Synthesize all inferred details into a coherent, flowing Korean sentence (or set of sentences) that visually paints the scene as if guiding a visually impaired person. The description must be rich in visual cues.

## Rules & Constraints
* **Single Subject Focus**: The generated description MUST focus on **only one person**: the identified primary subject. Do not describe other individuals present in the scene, even if implied by the diary entry.
* **Anonymity**: Do NOT use the primary subject's name or title in the final description. Refer to them using general terms such as '한 인물' (one person), '그 사람' (that person), '주인공' (the protagonist), or '그 인물' (the individual). When the primary subject is "나", refer to them as '한 인물', '주인공' 등으로 표현해야 합니다.
* **Exclusion**: Absolutely DO NOT include any information about the subject's gender, age, specific facial features (e.g., nose shape, specific eye color), hair color/style, or clothing/outfit details.
* **Language**: The final scene description MUST be in natural, evocative Korean.
* **Inferential Depth**: Emphasize deriving extensive, specific details from minimal explicit information in the diary entry. The AI must "fill in the blanks" imaginatively but logically.

## Output Format
The response must be a JSON object with two keys:
* \`TEXT\`: The detailed scene description in Korean.
* \`PERSON\`: The identified primary subject (e.g., "교수", "친구", "엄마", "나").

## Examples (Few-shot Prompting)

### Example 1
**User Diary Entry:** 아침은 건너뛰고 대충 세수만 하고 학교로 향했다. 첫 수업은 <디지털 콘텐츠 디자인>. 내가 제일 좋아하는 과목이지만, 오늘따라 @교수님이 PPT만 줄줄 읽으셔서 좀 지루했다.

**AI Response:**
\`\`\`json
{
  "TEXT": "강의실 앞쪽, 어둡고 희미한 조명 아래에 한 인물이 서 있다. 그 사람은 프로젝터 화면을 향해 몸을 반쯤 돌린 채 한 손으로 화면을 가리키며 무표정하게 서류를 읽어 내려가고 있다. 그의 시선은 오로지 화면에 고정되어 있으며, 어깨는 약간 앞으로 숙여진 채 정적인 자세를 유지한다. 주변의 학생들은 책상에 앉아 고요히 그와 화면을 응시하고 있다.",
  "PERSON": "교수"
}
### Example 2
**User Diary Entry:** 점심시간에 @민수랑 같이 학교 식당에서 밥을 먹었다. 민수는 오늘따라 말이 없었다.

**AI Response:**
\`\`\`json
{
  "TEXT": "교내 식당의 플라스틱 테이블에 한 인물이 앉아 있다. 그 사람의 시선은 자신의 식판 위 음식에 고정되어 있고, 젓가락은 움직임 없이 밥 위에 놓여 있다. 입은 굳게 다물려 있으며, 어깨는 약간 아래로 처져 있고, 손은 무릎 위에 놓인 채로 보인다. 주변은 식사하는 학생들로 인해 소음이 가득하지만, 그 인물이 앉은 공간만은 마치 투명한 막으로 둘러싸인 듯 고요하고 정적인 분위기가 감돈다.",
  "PERSON": "민수"
}
### Example 3
**User Diary Entry:** 엄마랑 시장에 갔다. @엄마는 내가 흥정하는 거 보더니 잘한다고 칭찬해줬다.

**AI Response:**
\`\`\`json
{
  "TEXT": "활기찬 시장의 노점상 앞에 한 인물이 서 있다. 그 인물의 입꼬리는 분명하게 위로 향하고 있고, 눈은 반달 모양으로 휘어져 있어 기쁨이 가득한 표정이다. 한 손은 다른 사람의 어깨를 가볍게 두드리며 격려하는 듯한 제스처를 취하고 있다. 주변으로는 색색의 과일과 채소들이 쌓여 있고, 분주하게 오가는 사람들 속에서 따뜻하고 활기찬 분위기가 느껴진다. 그 인물이 서 있는 공간은 칭찬과 격려의 빛으로 밝게 빛나는 듯하다.",
  "PERSON": "엄마"
}
### Example 4
**User Diary Entry:** 오늘 아침, 늦잠을 자서 학교에 지각할 뻔했다. 허겁지겁 집을 나섰는데 다행히 버스를 탈 수 있었다.
**AI Response:**
\`\`\`json
{
  "TEXT": "햇살이 쏟아지는 아침, 한 인물이 집 문을 박차고 뛰어나오고 있다. 그의 몸은 앞으로 잔뜩 기울어져 있고, 팔은 달리는 속도에 맞춰 힘차게 앞뒤로 흔들리고 있다. 얼굴에는 급박함과 약간의 당황스러움이 스쳐 지나가는 듯 보이며, 시선은 저 멀리 버스 정류장을 향해 고정되어 있다. 발걸음은 조급하게 바닥을 차고 있고, 주변의 상쾌한 아침 공기에도 불구하고 그의 주변은 서두르는 열기로 가득 차 있다.",
  "PERSON": "나"
}
`,
        }
      ],
    };

    const model = 'gemini-2.5-flash';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: diaryContent,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let result = '';
    for await (const chunk of response) {
      if (chunk.text) {
        result += chunk.text;
      }
    }

    const parsedResult = JSON.parse(result.trim());
    return parsedResult;

  } catch (error) {
    console.error('Scene description generation error:', error);
    throw new Error('장면 묘사 생성에 실패했습니다.');
  }
}

// Image Prompt Generator - 장면 묘사 중심으로 최적화
async function generateImagePrompt(sceneDescription, gender, userAppearanceKeywords, mandatoryKeywords) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
      thinkingConfig: {
        thinkingBudget: 24576,
      },
      responseMimeType: 'text/plain',
      systemInstruction: [
        {
          text: `## Persona
You are an expert-level "ComfyUI/Stable Diffusion Prompt Engineer" specializing in scene-to-prompt conversion. Your mission is to transform Korean scene descriptions into perfectly structured, comma-separated English prompts that capture 100% of the visual information while maintaining professional image generation standards.

## Core Task
Your primary task is to **extract and convert EVERY visual detail** from the Korean scene description into a comprehensive English prompt. You must ensure that no visual information is lost in translation - every pose, expression, environmental detail, lighting condition, and atmospheric element must be preserved and enhanced.

## Inputs
You will receive four types of input:
1.  **[KOREAN_SCENE_DESCRIPTION]:** The complete visual blueprint containing all scene details. **This is your primary and most important source - extract 100% of its content.**
2.  **[GENDER]:** Character's gender (남성/여성/기타) - convert to appropriate English keyword.
3.  **[USER_APPEARANCE_KEYWORDS]:** English keywords provided by the user describing the protagonist's appearance (without gender).
4.  **[MANDATORY_KEYWORDS]:** English keywords that must be included in the prompt.

## Gender Mapping
- 남성 → 1man
- 여성 → 1woman  
- 기타 → 1person

## Step-by-Step Process
1.  **Complete Scene Analysis:** Thoroughly analyze the Korean scene description and extract EVERY visual element:
    * **Character Details:** Exact posture, pose, body positioning, facial expressions, gaze direction, hand positions, body orientation
    * **Environmental Elements:** All objects, furniture, architectural details, spatial relationships
    * **Atmospheric Conditions:** Lighting quality, shadows, weather, time of day, mood, colors, textures
    * **Compositional Elements:** Camera angles, perspective, depth, focal points

2.  **Comprehensive Translation:** Convert each Korean visual element into precise English keywords:
    * Maintain the exact meaning and intensity of each descriptive element
    * Use specific, technical vocabulary for poses and expressions
    * Preserve all spatial and atmospheric details
    * Ensure no visual information is omitted or simplified

3.  **Integration and Enhancement:** Combine translated elements with user inputs:
    * Integrate gender keyword as the leading subject identifier
    * Weave in user appearance keywords naturally within the character description
    * Place mandatory keywords at the beginning as specified

4.  **Professional Structure:** Organize all elements according to the hierarchy below, ensuring complete coverage of the scene description.

## Professional Prompt Structure
The prompt must capture 100% of the scene description while following this hierarchical order:

1.  **Mandatory Keywords First:** Place all mandatory keywords at the very beginning
2.  **Subject:** Gender keyword + core character composition from scene description
3.  **Character Details:** Complete extraction of all character-related visual information from the scene + user appearance keywords
4.  **Action/Pose:** Every detail about what the character is doing, how they're positioned, their exact posture
5.  **Environment:** All environmental details, objects, spatial relationships, and setting elements from the scene
6.  **Atmosphere:** Complete lighting, mood, color, and atmospheric conditions from the scene description
7.  **Technical Quality:** Professional image generation tags

## Critical Requirements
- **100% Scene Coverage:** Every visual detail from the Korean scene description must appear in the English prompt
- **No Information Loss:** Do not simplify, omit, or generalize any visual elements
- **Precise Translation:** Use specific, accurate English terms that match the Korean descriptions exactly
- **Enhanced Detail:** Where the Korean description implies visual elements, make them explicit in English
- **Professional Syntax:** Use proper weighting, comma separation, and technical formatting

## Technical Syntax & Advanced Techniques
- **Explicit Weighting:** Use \`(keyword:value)\` for emphasis. Keep values between 0.5-1.5
- **Shortcut Weighting:** \`(keyword)\` = 1.1 weight, \`[keyword]\` = 0.9 weight
- **Randomization:** \`{A|B|C}\` for variety when appropriate
- **Comments:** Use \`//\` or \`/* */\` for annotations (ignored during generation)

## Output Requirements
- **English Only:** No Korean text in the final prompt
- **Comma-Separated:** Phrase-based structure, not sentences
- **Complete Coverage:** Every element from the scene description must be represented
- **Single Scene Focus:** One coherent scene with one protagonist
- **No NSFW Content:** Maintain appropriate content standards

## Quality Assurance
Before finalizing, verify that:
1. All character details from the scene description are included
2. All environmental elements are translated and included
3. All atmospheric conditions are captured
4. Mandatory keywords are placed first
5. User appearance keywords are integrated naturally
6. The prompt flows logically and professionally
`,
        }
      ],
    };

    const model = 'gemini-2.5-flash';
    
    const inputText = `[KOREAN_SCENE_DESCRIPTION]: ${sceneDescription}
[GENDER]: ${gender}
[USER_APPEARANCE_KEYWORDS]: ${userAppearanceKeywords}
[MANDATORY_KEYWORDS]: ${mandatoryKeywords}
주의사항: MANDATORY_KEYWORDS이 맨 앞 가장 먼저 와야합니다. 장면 묘사의 모든 시각적 정보를 100% 보존하여 영어 프롬프트로 변환해주세요.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: inputText,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let result = '';
    for await (const chunk of response) {
      if (chunk.text) {
        result += chunk.text;
      }
    }

    return result.trim();

  } catch (error) {
    console.error('Image prompt generation error:', error);
    throw new Error('이미지 프롬프트 생성에 실패했습니다.');
  }
}

// Protagonist Name Extractor (레거시 함수 - 필요시 사용)
async function generateProtagonistName(diaryContent) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
      responseMimeType: 'text/plain',
      systemInstruction: [
        {
          text: `## Persona
You are an expert "Protagonist Name Extractor". Your task is to analyze diary content and extract the main character's name if one is mentioned.

## Core Task
Read the diary content and identify if there's a specific person's name mentioned as the main character or protagonist of the story. 

## Rules
1. Only extract actual Korean names (like 카리나, 지수, 민수, etc.)
2. Do NOT extract common nouns, pronouns, or generic terms
3. Do NOT extract names of celebrities, fictional characters, or brands
4. If no clear protagonist name is found, return empty string
5. Return only the name itself, nothing else
6. If multiple names are mentioned, choose the one that appears to be the main character

## Examples
- "오늘 카리나와 함께 영화를 봤다" → "카리나"
- "지수가 선물을 줬다" → "지수"
- "친구와 함께 갔다" → ""
- "나는 오늘 책을 읽었다" → ""

## Output Format
Return only the extracted name or empty string. No explanation or additional text.`,
        }
      ],
    };

    const model = 'gemini-2.5-flash';
    
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: diaryContent,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let result = '';
    for await (const chunk of response) {
      if (chunk.text) {
        result += chunk.text;
      }
    }

    return result.trim();

  } catch (error) {
    console.error('Protagonist name extraction error:', error);
    return null;
  }
}

module.exports = {
  generateSceneDescription,
  generateImagePrompt,
  generateProtagonistName
}; 