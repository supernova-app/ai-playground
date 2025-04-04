import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

type AudioRecorderProps = {
  onAudioCaptured: (audioData: string, mimeType: string) => void;
  disabled?: boolean;
  className?: string;
};

export function AudioRecorder({
  onAudioCaptured,
  disabled = false,
  className,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();

        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          const base64Content = base64Data.split(",")[1];

          onAudioCaptured(base64Content, "audio/webm");
          setIsRecording(false);

          // Clean up the media stream
          stream.getTracks().forEach((track) => track.stop());
        };

        reader.readAsDataURL(audioBlob);
      });

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording started...", { id: "audio-recording" });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error(
        "Could not access microphone. Please check permissions and try again.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      toast.success("Recording captured!", { id: "audio-recording" });
    }
  };

  // Listen for Escape key to stop recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRecording) {
        stopRecording();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={toggleRecording}
      title={isRecording ? "Stop Recording" : "Record Audio"}
      className={cn(
        isRecording && "animate-pulse bg-red-100 dark:bg-red-900/30",
        className,
      )}
    >
      {isRecording ? (
        <Square className="h-4 w-4 text-red-500" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
