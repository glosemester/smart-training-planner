/**
 * nutrition.js
 * AI-powered meal planning using Gemini
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const getGeminiKey = () => process.env.GEMINI_API_KEY;

/**
 * Generate a personalized meal plan based on training volume and goals
 */
exports.generateMealPlan = onCall({
  timeoutSeconds: 60,
  secrets: ['GEMINI_API_KEY'],
  cors: true
}, async (request) => {
  const { weeklyTrainingHours, goal, dietaryPreferences, allergies } = request.data;

  if (!weeklyTrainingHours || !goal) {
    throw new HttpsError('invalid-argument', 'weeklyTrainingHours and goal are required');
  }

  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'API Key not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Calculate calories based on training volume
  const baseCalories = 2000;
  const trainingCalories = weeklyTrainingHours * 300; // ~300 kcal per training hour
  const dailyTrainingCalories = Math.round(trainingCalories / 7);

  let targetCalories;
  switch (goal) {
    case 'bulk':
      targetCalories = baseCalories + dailyTrainingCalories + 300; // Surplus
      break;
    case 'cut':
      targetCalories = baseCalories + dailyTrainingCalories - 500; // Deficit
      break;
    case 'maintain':
    default:
      targetCalories = baseCalories + dailyTrainingCalories;
  }

  const systemPrompt = `Du er en profesjonell ernæringsveileder som spesialiserer seg på idrettsernæring.

Du lager PERSONLIGE, VARIERTE og PRAKTISKE matplaner for utøvere.

**VIKTIGE PRINSIPPER:**
- Høyt proteininntak (1.6-2.2g per kg kroppsvekt) for restitusjon
- Karbohydrater tilpasset treningsvolum (mer trening = mer karbs)
- Sunt fett (25-35% av totalkalorierne)
- Rikelig med grønnsaker og fiber
- ENKLE oppskrifter som tar <30 min å lage
- Realistiske porsjoner
- Norske matvarer og oppskrifter

**OUTPUT FORMAT:**
Returner KUN rå JSON (ingen markdown, ingen tekst). Bruk denne strukturen:

{
  "summary": {
    "targetCalories": number,
    "macros": {
      "protein": number (gram per dag),
      "carbs": number (gram per dag),
      "fat": number (gram per dag)
    },
    "mealsPerDay": number
  },
  "days": [
    {
      "day": "Mandag",
      "meals": [
        {
          "type": "breakfast|lunch|dinner|snack",
          "name": "string - navn på måltidet",
          "description": "string - KORT beskrivelse (1-2 setninger)",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "ingredients": ["ingrediens1", "ingrediens2"],
          "prepTime": number (minutter)
        }
      ],
      "totalCalories": number,
      "totalProtein": number,
      "totalCarbs": number,
      "totalFat": number
    }
  ],
  "shoppingList": {
    "proteins": ["kylling 1kg", "laks 500g"],
    "carbs": ["ris 500g", "havre 1kg"],
    "vegetables": ["brokkoli 2 hoder", "paprika 4 stk"],
    "dairy": ["gresk yoghurt 500g", "cottage cheese 500g"],
    "other": ["olivenolje", "salt", "pepper"]
  },
  "tips": ["string - 3-4 nyttige tips"]
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt
    });

    const prompt = `
Lag en 7-dagers matplan med følgende parametere:

**BRUKERINFO:**
- Ukentlig treningsmengde: ${weeklyTrainingHours} timer
- Mål: ${goal === 'bulk' ? 'Bygge muskler / øke vekt' : goal === 'cut' ? 'Gå ned i vekt / definisjon' : 'Vedlikehold / prestasjon'}
- Kaloriemål per dag: ~${targetCalories} kcal
${dietaryPreferences ? `- Mat-preferanser: ${dietaryPreferences}` : ''}
${allergies ? `- Allergier/intoleranse: ${allergies}` : ''}

**KRAV:**
- 4 måltider per dag (frokost, lunsj, middag, snacks)
- Hver dag skal treffe ~${targetCalories} kcal
- Høyt proteininnhold (min 150g per dag)
- Variert kosthold gjennom uken
- Norske oppskrifter og matvarer
- Realistiske porsjoner for en voksen person
- Enkle oppskrifter (<30 min)

Lag en komplett plan med alle 7 dager, makronæringsstoffer og handleliste.

VIKTIG: Svar KUN med JSON. Ingen tekst før eller etter JSON-objektet.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean response
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new HttpsError('internal', 'AI returned invalid JSON format');
    }

    let jsonString = text.substring(start, end + 1);
    jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    const mealPlan = JSON.parse(jsonString);

    return {
      ...mealPlan,
      generatedAt: new Date().toISOString(),
      parameters: {
        weeklyTrainingHours,
        goal,
        targetCalories
      }
    };

  } catch (error) {
    console.error('Meal plan generation error:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate meal plan');
  }
});

/**
 * Generate recipe suggestions based on available ingredients (Smart Fridge)
 */
exports.generateRecipeFromIngredients = onCall({
  timeoutSeconds: 30,
  secrets: ['GEMINI_API_KEY'],
  cors: true
}, async (request) => {
  const { ingredients, mealType, calories } = request.data;

  if (!ingredients || ingredients.length === 0) {
    throw new HttpsError('invalid-argument', 'ingredients are required');
  }

  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'API Key not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemPrompt = `Du er en kreativ kokk som lager oppskrifter basert på tilgjengelige ingredienser.

**PRINSIPPER:**
- Bruk KUN ingrediensene brukeren har oppgitt
- Hvis noe mangler (krydder, olje, etc), nevn det som "kan legges til hvis du har"
- Enkle oppskrifter med få steg
- Realistiske porsjoner
- Norsk kokkestil

**OUTPUT FORMAT:**
Returner KUN rå JSON:

{
  "recipes": [
    {
      "name": "string - oppskriftens navn",
      "description": "string - kort beskrivelse",
      "servings": number,
      "cookTime": number (minutter),
      "difficulty": "easy|medium|hard",
      "ingredients": [
        {
          "item": "string",
          "amount": "string",
          "optional": boolean
        }
      ],
      "instructions": ["steg 1", "steg 2", "steg 3"],
      "nutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      }
    }
  ]
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt
    });

    const prompt = `
Lag 2-3 oppskrifter basert på disse ingrediensene:

**TILGJENGELIGE INGREDIENSER:**
${ingredients.map(i => `- ${i}`).join('\n')}

${mealType ? `**MÅLTID TYPE:** ${mealType}` : ''}
${calories ? `**KALORI-MÅL:** ~${calories} kcal per porsjon` : ''}

Lag kreative, sunne og enkle oppskrifter som bruker disse ingrediensene.

VIKTIG: Svar KUN med JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new HttpsError('internal', 'AI returned invalid JSON format');
    }

    let jsonString = text.substring(start, end + 1);
    jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    const recipes = JSON.parse(jsonString);

    return recipes;

  } catch (error) {
    console.error('Recipe generation error:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate recipes');
  }
});
