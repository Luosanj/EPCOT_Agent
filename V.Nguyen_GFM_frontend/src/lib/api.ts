export const API_BASE_URL = "http://localhost:8000";

// A simple placeholder response generator for testing without the backend
const generatePlaceholderResponse = (message: string) => {
  if (message.toLowerCase().includes("upload") || message.toLowerCase().includes("bam")) {
    return "I see you're talking about a BAM file. If you haven't yet, please upload it and then provide a genomic region like 'chr1, 100000, 200000'.";
  }
  if (message.toLowerCase().includes("chr")) {
    return "I will analyze the specified region. Please confirm if you want to proceed with EFP, GEP, or EAP prediction.";
  }
  return "This is a placeholder response from the frontend since the backend is currently disabled or unreachable.";
};

export const uploadBamFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload_bam`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend unavailable, using placeholder for upload_bam:", error);
    return {
      message: `${file.name} uploaded successfully (placeholder).`,
      next_step: "Please provide genomic region:\nchr1, 100000, 200000 (placeholder)"
    };
  }
};

export const sendChatMessage = async (message: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend unavailable, using placeholder for chat:", error);
    return {
      reply: generatePlaceholderResponse(message)
    };
  }
};
