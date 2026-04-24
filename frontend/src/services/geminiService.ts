import { GoogleGenAI, Type } from "@google/genai";
import { Report, Team, RouteOptimization, Facility } from "../types";

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function suggestNearbyFacilities(location: { latitude: number, longitude: number }): Promise<Facility[]> {
  const prompt = `
    Find nearby emergency facilities for an incident at Mumbai location: ${location.latitude}, ${location.longitude}.
    
    Identify:
    1. At least 2 Hospitals (with Trauma centers).
    2. At least 1 Police Station.
    3. At least 1 Petrol Pump (for refuelling units).
    
    Return realistic Mumbai names and approximate lat/lng near the target.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["hospital", "police_station", "petrol_pump"] },
              location: {
                type: Type.OBJECT,
                properties: {
                  latitude: { type: Type.NUMBER },
                  longitude: { type: Type.NUMBER }
                },
                required: ["latitude", "longitude"]
              },
              distance: { type: Type.NUMBER, description: "Distance in KM" }
            },
            required: ["id", "name", "type", "location", "distance"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Suggest Facilities Error:", error);
    return [];
  }
}

export async function optimizeRoute(report: Report, team: Team): Promise<RouteOptimization> {
  const currentTime = new Date().toLocaleTimeString();
  
  const prompt = `
    Analyze life-saving emergency navigation for a rescue team in Mumbai.
    Current Time: ${currentTime}
    
    CRITICAL INCIDENT:
    Title: ${report.title}
    Type: ${report.type}
    Narrative: ${report.description}
    Priority: ${report.priority}
    Target Location: ${report.latitude}, ${report.longitude}
    
    RESCUE ASSET:
    Name: ${team.name}
    Type: ${team.type}
    Current Position: ${team.latitude}, ${team.longitude}
    
    ENVIRONMENTAL FACTORS (Simulated Real-Time):
    - Weather: Active monsoon warnings, 45mm rainfall in last hour.
    - Traffic: High congestion on Western Express Highway.
    - Hazards: Potential for waterlogging at Milan Subway and Andheri Subway.
    - Disaster Impact: Possible debris on secondary roads near incident.
    
    TASK:
    Generate a DYNAMICALLY optimized route. If this is a re-route, acknowledge changing conditions.
    Focus on:
    1. Avoiding flooded zones.
    2. Priority clearance for emergency vehicles.
    3. Structural safety for heavy vehicles (fire brigades).
    
    Provide a detailed route optimization JSON including path coordinates (at least 5-10 lat/lng pairs including start and end) to draw a polyline on the map.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedRoute: { type: Type.STRING, description: "Detailed step-by-step route suggestion" },
            estimatedTime: { type: Type.STRING, description: "Estimated time of arrival" },
            weatherConditions: { type: Type.STRING, description: "Relevant weather context" },
            hazards: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                  location: {
                    type: Type.OBJECT,
                    properties: {
                      latitude: { type: Type.NUMBER },
                      longitude: { type: Type.NUMBER }
                    },
                    required: ["latitude", "longitude"]
                  }
                },
                required: ["description", "severity", "location"]
              },
              description: "List of tactical hazards detected on or near the suggested route"
            },
            alternatives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Secondary route options if the primary is blocked"
            },
            pathCoordinates: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: "[latitude, longitude] pair"
              },
              description: "Sequence of coordinates representing the path"
            }
          },
          required: ["suggestedRoute", "estimatedTime", "weatherConditions", "hazards", "alternatives", "pathCoordinates"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as RouteOptimization;
  } catch (error) {
    console.error("Gemini Route Optimization Error:", error);
    return {
      suggestedRoute: "Direct path via main arterial roads.",
      estimatedTime: "Calculated dynamically",
      weatherConditions: "No specific data available",
      hazards: [],
      alternatives: ["Standard alternate routes"],
      pathCoordinates: []
    };
  }
}
