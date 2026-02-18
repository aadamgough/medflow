import {
  Activity,
  Pill,
  Stethoscope,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimelineEvent, EventType } from "@/lib/api";

interface TimelineViewProps {
  events: TimelineEvent[];
}

function getEventIcon(eventType: EventType) {
  const iconClass = "h-5 w-5";
  switch (eventType) {
    case "DIAGNOSIS":
      return <Stethoscope className={iconClass} />;
    case "MEDICATION_START":
    case "MEDICATION_STOP":
    case "MEDICATION_CHANGE":
      return <Pill className={iconClass} />;
    case "PROCEDURE":
      return <Activity className={iconClass} />;
    case "LAB_RESULT":
      return <FileText className={iconClass} />;
    case "HOSPITAL_ADMISSION":
    case "HOSPITAL_DISCHARGE":
      return <Building2 className={iconClass} />;
    case "OFFICE_VISIT":
      return <Calendar className={iconClass} />;
    default:
      return <AlertCircle className={iconClass} />;
  }
}

function getEventColor(eventType: EventType): string {
  switch (eventType) {
    case "DIAGNOSIS":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    case "MEDICATION_START":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "MEDICATION_STOP":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
    case "MEDICATION_CHANGE":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    case "PROCEDURE":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    case "LAB_RESULT":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "HOSPITAL_ADMISSION":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
    case "HOSPITAL_DISCHARGE":
      return "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20";
    case "OFFICE_VISIT":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  }
}

function formatEventType(eventType: EventType): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimelineView({ events }: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No timeline events
        </h3>
        <p className="text-muted-foreground">
          Timeline events will appear here as documents are processed
        </p>
      </Card>
    );
  }

  const eventsByDate = events.reduce((acc, event) => {
    const date = formatDate(event.eventDate);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(eventsByDate).map(([date, dateEvents]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-foreground">{date}</h3>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <div className="space-y-4 ml-4">
            {dateEvents.map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg shrink-0 ${getEventColor(event.eventType)}`}>
                    {getEventIcon(event.eventType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getEventColor(event.eventType)}>
                          {formatEventType(event.eventType)}
                        </Badge>
                        {event.confidence !== null && (
                          <span className="text-xs text-muted-foreground">
                            {(event.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {formatTime(event.eventDate)}
                      </span>
                    </div>

                    <p className="text-base text-foreground mb-3">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>
                        From:{" "}
                        <span className="font-medium">
                          {event.extraction.document.originalFilename}
                        </span>
                      </span>
                    </div>

                    {event.structuredData &&
                      Object.keys(event.structuredData).length > 0 && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Additional Details:
                          </p>
                          <div className="space-y-1 text-sm">
                            {Object.entries(event.structuredData).map(
                              ([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground">
                                    {key}:
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
