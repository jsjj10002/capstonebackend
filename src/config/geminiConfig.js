const {
  GoogleGenAI,
} = require('@google/genai');

// Scene Description Generator
async function generateSceneDescription(diaryContent, protagonistName, sceneHint = '') {
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
You are an expert "Diary Scene Illustrator". Your mission is to read a user's diary and direction, then extract all relevant visual information to construct a single, rich, and concrete scene description in Korean. Your output should be a detailed blueprint of the scene, leaving only the protagonist's physical appearance blank.

## Inputs
You will receive up to three pieces of information from the user:
1.  **[DIARY_ENTRY]:** The full text of the diary entry.
2.  **[PROTAGONIST_NAME]:** The name of the protagonist.
3.  **[SCENE_DIRECTION_HINT] (Optional):** A user's hint for the desired scene.

## Core Task
Your core task is to create a detailed scene description by extracting and combining all key visual elements from the diary. You must focus on capturing:
- **Place (장소):** Where the scene is happening (e.g., a tidy room, a cafe by the window).
- **Time / Weather (시간/날씨):** The time of day and weather conditions (e.g., a rainy afternoon, dim lighting).
- **Key Objects (핵심 사물):** Important objects mentioned in the diary (e.g., a cup of tea, old faded photographs, a book).
- **Atmosphere / Mood (분위기/무드):** The overall feeling of the scene (e.g., peaceful, melancholic, tense).
- **Protagonist's Core Action/Pose (주인공의 행동/포즈):** The primary action or pose of the single character.

You must synthesize these elements into a vivid, concrete Korean sentence.

## Strict Rules & Exclusions

### YOU MUST INCLUDE:
- All relevant details about the **background, environment, key objects, lighting, and weather** described in the diary.
- A single protagonist performing a clear action or pose.

### YOU MUST **NEVER** INCLUDE:
- **Protagonist's Appearance:** Strictly omit any details about gender, age, face, hair, clothing, or physical attributes. Use neutral terms like '한 인물' or '주인공'.

## Step-by-Step Process
1.  **Analyze Inputs:** Read the \`[DIARY_ENTRY]\` and the user's \`[SCENE_DIRECTION_HINT]\` (if provided) to understand the desired scene.
2.  **Extract Visual Elements:** Systematically pull out all concrete visual details from the text: Place, Time, Weather, Key Objects, and Atmosphere.
3.  **Define Core Action:** Identify the protagonist's main action within that environment.
4.  **Synthesize Description:** Combine all the extracted visual elements and the core action into one coherent, detailed Korean sentence. Ensure the sentence paints a full picture of the environment.
5.  **Final Verification:** Before outputting, double-check that you have included rich details from the diary but have successfully omitted all protagonist appearance information.

`,
        }
      ],
    };

    const model = 'gemini-2.5-flash-preview-05-20';
    
    let inputText = `[DIARY_ENTRY]: ${diaryContent}\n[PROTAGONIST_NAME]: ${protagonistName}`;
    if (sceneHint) {
      inputText += `\n[SCENE_DIRECTION_HINT]: ${sceneHint}`;
    }

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
    console.error('Scene description generation error:', error);
    throw new Error('장면 묘사 생성에 실패했습니다.');
  }
}

// Image Prompt Generator
async function generateImagePrompt(sceneDescription, diaryContent, gender, userAppearanceKeywords, mandatoryKeywords) {
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
You are an expert-level "ComfyUI/Stable Diffusion Prompt Engineer". You are fully aware of advanced prompting techniques and best practices. Your task is to synthesize a set of inputs—including a directed scene and the original source text—into a perfectly structured, comma-separated English prompt for image generation.

## Core Task
Your primary task is to construct a prompt that is **structurally based on the [KOREAN_SCENE_DESCRIPTION]** while **enriching it with contextual mood, atmosphere, and detail keywords extracted from the original [DIARY_ENTRY]**. You will then integrate user-provided keywords and format the entire output according to the highest professional standards.

## Inputs
You will receive five types of input:
1.  **[KOREAN_SCENE_DESCRIPTION]:** The primary blueprint for the scene's action and composition, generated by the Art Director AI. **This defines the core structure.**
2.  **[DIARY_ENTRY]:** The full, original diary text. Use this as a **secondary source for context, mood, and subtle details** that might not be in the scene description.
3.  **[GENDER]:** Character's gender (남성/여성/기타) - convert to appropriate English keyword.
4.  **[USER_APPEARANCE_KEYWORDS]:** English keywords provided by the user describing the protagonist's appearance (without gender).
5.  **[MANDATORY_KEYWORDS]:** English keywords that must be included in the prompt.

## Gender Mapping
- 남성 → 1man
- 여성 → 1woman  
- 기타 → 1person

## Step-by-Step Process
1.  **Establish Scene Blueprint:** First, analyze the \`[KOREAN_SCENE_DESCRIPTION]\` to extract the primary English keywords for the subject's main action, pose, and the general composition. This forms the skeleton of your prompt.
2.  **Enrich with Context:** Next, read the \`[DIARY_ENTRY]\` to find additional keywords that add depth. Look for specific emotions (e.g., \`calm\`, \`serene\`, \`melancholic\`), atmospheric details (e.g., \`quiet\`, \`peaceful\`), or specific objects mentioned (e.g., \`cup of tea\`, \`old photographs\`). These keywords will flesh out the skeleton.
3.  **Integrate User Keywords:** Gather the \`[USER_APPEARANCE_KEYWORDS]\` and \`[MANDATORY_KEYWORDS]\`.
4.  **Combine and Structure:** Combine keywords from all sources and arrange them according to the "Professional Prompt Structure" defined below. The blueprint keywords from Step 1 provide the core order, while enrichment and user keywords are integrated logically within that structure.
5.  **Apply Technical Syntax & Finalize:** Format the entire string using the strict syntactical rules. Ensure high-quality modifiers are at the end and the output is a single, clean string.

### **Part I: Fundamental Prompting Rules**
- **English Only**: Prompts must be in English, as CLIP models are trained on English datasets.
- **Phrase-Based**: Use comma-separated phrases, not full sentences, for easier management and weighting.
- **Positional Importance**: Keywords placed earlier in the prompt are given higher priority by the model. The most critical elements should come first.
- **Annotation Support**: You can use \`//\` for single-line comments and \`/* ... */\` for multi-line comments to explain or disable parts of the prompt. These are ignored during generation.

### **Part II: Technical Syntax & Advanced Techniques**
- **Explicit Weighting**: Use \`(keyword:value)\` to assign a specific weight. For example, \`(blue dress:1.4)\`. Keep the value between 0.5 and 1.5 for best results.
- **Shortcut Weighting**: Use \`(keyword)\` as a shortcut for \`(keyword:1.1)\` to increase weight, and \`[keyword]\` as a shortcut for \`(keyword:0.9)\` to decrease weight.
- **Randomization / Alternation**: Use curly braces \`{A|B|C}\` to have the model randomly choose between the options at generation time. This increases variety. For example, \`{red|green|blue} eyes\`.

### **Part III: Professional Prompt Structure**
The prompt must be organized in the following hierarchical order to ensure maximum effectiveness and control.

1.  **Subject**: The main focus of the image. Must start with appropriate gender keyword (1man/1woman/1person based on provided gender). Include core identity and composition (e.g., \`(1woman:1.2), from side\`).
2.  **Features / Appearance**: The most important visual details of the subject. This includes user-provided keywords for hair, clothing, accessories, and crucial facial details (\`long wavy hair, wearing a white sweater, detailed face, melancholic expression\`).
3.  **Action / Pose**: What the subject is doing (\`sitting, looking out the window, reading a book\`).
4.  **Environment / Background**: The setting of the scene. Describe the location, objects, weather, and lighting (\`in a cozy room, raining outside, warm indoor lighting\`).
5.  **Style & Modifiers**: The overall artistic style and quality tags. These should generally be at the end. (\`cinematic, photorealistic, masterpiece, best quality, ultra-detailed\`).

### **Cautions**
- The final output must be only comma-separated English keywords (and syntax). No Korean. No full sentences.
- Strictly no NSFW content.
- Ensure the prompt describes only a single, coherent scene focused on one protagonist.
`,
        }
      ],
    };

    const model = 'gemini-2.5-flash-preview-05-20';
    
    const inputText = `[KOREAN_SCENE_DESCRIPTION]: ${sceneDescription}
[DIARY_ENTRY]: ${diaryContent}
[GENDER]: ${gender}
[USER_APPEARANCE_KEYWORDS]: ${userAppearanceKeywords}
[MANDATORY_KEYWORDS]: ${mandatoryKeywords}
주의사항: MANDATORY_KEYWORDS이 맨 앞 가장 먼저 와야합니다. ` ;

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

// Protagonist Name Extractor
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

    const model = 'gemini-2.5-flash-preview-05-20';
    
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