export const getWaitlistQuestions = async (businessDescription: string) => {
  const response = await fetch("/api/waitlist-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessDescription })
  });
  if (!response.ok) throw new Error("Failed to fetch waitlist questions");
  return response.json();
};

export const generateElevatorPitch = async (businessType: string, market: string) => {
  const response = await fetch("/api/generate-pitch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessType, market })
  });
  if (!response.ok) throw new Error("Failed to generate pitch");
  const data = await response.json();
  return data.text;
};

export const explainProduct = async (productName: string, userQuestion: string) => {
  const response = await fetch("/api/explain-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, userQuestion })
  });
  if (!response.ok) throw new Error("Failed to explain product");
  const data = await response.json();
  return data.text;
};

export const chatWithAI = async (message: string, history: any[]) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history })
  });
  if (!response.ok) throw new Error("Failed to chat with AI");
  const data = await response.json();
  return data.text;
};
