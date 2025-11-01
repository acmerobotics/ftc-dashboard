package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

import java.util.List;

public class ReceiveLogcatErrors extends Message {
    private List<LogcatError> errors;

    public ReceiveLogcatErrors(List<LogcatError> errors) {
        super(MessageType.RECEIVE_LOGCAT_ERRORS);
        this.errors = errors;
    }

    public List<LogcatError> getErrors() {
        return errors;
    }

    public static class LogcatError {
        private long timestamp;
        private String level;
        private String tag;
        private String message;

        public LogcatError(long timestamp, String level, String tag, String message) {
            this.timestamp = timestamp;
            this.level = level;
            this.tag = tag;
            this.message = message;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public String getLevel() {
            return level;
        }

        public String getTag() {
            return tag;
        }

        public String getMessage() {
            return message;
        }
    }
}