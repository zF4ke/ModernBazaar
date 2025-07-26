package com.modernbazaar.core.api;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Centralized exception handling for all REST controllers.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles validation failures on @RequestBody / @Valid.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex,
            WebRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Validation failed",
                fieldErrors
        );
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handles malformed JSON or unreadable request bodies.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    protected ResponseEntity<ErrorResponse> handleMalformedJson(
            HttpMessageNotReadableException ex,
            WebRequest request) {

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Malformed JSON request",
                ex.getMessage()
        );
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handles lookups that failed (e.g. .orElseThrow on findById).
     */
    @ExceptionHandler(NoSuchElementException.class)
    protected ResponseEntity<ErrorResponse> handleNotFound(
            NoSuchElementException ex,
            WebRequest request) {

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                null
        );
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    /**
     * Catch‑all for everything else.
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ErrorResponse> handleAll(
            Exception ex,
            WebRequest request) {

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "An unexpected error occurred",
                ex.getMessage()
        );
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Standard error payload for all handlers.
     */
    public record ErrorResponse(Instant timestamp, int status, String error, Object details) {}
}
