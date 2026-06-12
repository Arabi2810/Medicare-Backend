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
      "testDefinition": "ONE short sentence (max 20 words) explaining what this test checks, in simple language.",
      "patientRelevance": "ONE short sentence (max 25 words): why this test relates (or doesn't) to this patient's symptoms/diagnosis.",
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

Keep testDefinition and patientRelevance to ONE short sentence each, in simple language a normal person in Bangladesh can understand.
validityLevel rules: "essential" = directly needed for this patient's symptoms/diagnosis. "moderate" = useful but optional. "unnecessary" = unrelated to this patient.

Prescription Text:
${text}`;
};