export interface UserProfile {
  bloodGroup?: string | null;
  allergies?: string[];
  chronicConditions?: string[];
  gender?: string | null;
  dateOfBirth?: string | null;
}

export const getPrompt = (text: string, userProfile?: UserProfile) => {
  const profileContext = userProfile ? `

IMPORTANT PATIENT PROFILE (use this to improve test validity analysis):
- Blood Group: ${userProfile.bloodGroup || "Unknown"}
- Known Allergies: ${userProfile.allergies?.join(", ") || "None reported"}
- Chronic Conditions: ${userProfile.chronicConditions?.join(", ") || "None reported"}
- Gender: ${userProfile.gender || "Unknown"}
- Date of Birth: ${userProfile.dateOfBirth || "Unknown"}
` : "";

  return `You are a medical prescription parser. Extract and structure the following information from the prescription text provided.

IMPORTANT RULES:
1. Return ONLY a valid JSON object, no markdown formatting, no code blocks, no explanations
2. Use null for any field that is not found in the text
3. Arrays must always be present (use empty arrays [] if no data found)
4. Be thorough but accurate - extract only information explicitly mentioned
5. For medicine dosages, frequency, and duration: extract exact values from text
6. For gender: use only "M" or "F" or null, never other values
7. For symptoms and diagnosis: create a list of distinct items, remove duplicates
${profileContext}
Return JSON with EXACTLY this structure:

{
  "doctor": {
    "name": "full name if available or null",
    "specialization": "specialization if mentioned or null",
    "licenseNumber": "license number if provided or null",
    "contact": "phone or email if available or null"
  },
  "patient": {
    "name": "full name if available or null",
    "age": "age if mentioned (e.g., '35', '5 years') or null",
    "gender": "M or F if mentioned, otherwise null",
    "contact": "phone or email if available or null",
    "registrationNumber": "patient ID or registration number or null"
  },
  "symptoms": ["list of distinct symptoms or chief complaints"],
  "diagnosis": ["list of distinct diagnoses"],
  "tests": [
    {
      "name": "exact test name from prescription",
      "type": "lab test type/category if identifiable or null",
      "testDefinition": "Explain in simple everyday language what this test is and what it examines or measures in the human body. Write as if explaining to someone with no medical knowledge. Example: A CBC test checks your blood by counting red blood cells, white blood cells and platelets. It helps doctors find infections, anemia and other blood-related problems.",
      "patientRelevance": "Based on this patient's specific symptoms and diagnosis: If the test is needed — explain why the doctor ordered it, what they are trying to detect, and why the patient should take it. If the test is NOT needed — clearly explain that this test has no clear connection to the patient's condition and the patient can likely skip it. Be direct and honest in simple language.",
      "validityLevel": "essential or moderate or unnecessary"
    }
  ],
  "medicines": [
    {
      "name": "medicine name or brand name",
      "dosage": "dosage amount (e.g., '500mg', '2 tablets') or null",
      "frequency": "frequency (e.g., 'twice daily', 'every 6 hours') or null",
      "duration": "duration (e.g., '7 days', '2 weeks') or null",
      "instructions": "any special instructions like 'before food', 'after meals' or null"
    }
  ],
  "notes": "any additional notes, warnings, precautions, or allergies mentioned or null"
}

FOR EACH TEST analyze in this exact order:
1. testDefinition: What is this test? What does it measure in the human body? (simple language, no jargon)
2. patientRelevance: Is this test relevant for THIS patient?
   - If YES: Explain why the doctor ordered it and what they are trying to find for this patient specifically.
   - If NO: Clearly tell the patient this test seems unrelated to their condition and they may not need it.
3. validityLevel: Final verdict — "essential", "moderate", or "unnecessary"

STRICT RULES for validityLevel:
- "essential": Test is directly required to diagnose or monitor this patient. Skipping risks missing critical information.
- "moderate": Test gives useful extra information but is not strictly required. Good to take but can be skipped if cost is a concern.
- "unnecessary": Test has no clear link to this patient's symptoms or diagnosis. Likely not needed.

Always write in simple language a normal person in Bangladesh can understand. Avoid complex medical jargon.
Always base validity on the patient's specific symptoms and diagnosis. If patient profile is provided, use it to improve accuracy.

Prescription Text:
${text}`;
};