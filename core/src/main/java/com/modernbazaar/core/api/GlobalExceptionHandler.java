package com.modernbazaar.core.api;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Centralized exception handling for all REST controllers.
 * 
 * This class provides global exception handling for common error scenarios:
 * - Validation failures
 * - Malformed JSON requests
 * - Resource not found errors
 * - Rate limiting violations
 * - Access denied exceptions
 * - Unexpected system errors
 * 
 * All error responses are standardized and include relevant context information.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Handles validation failures on @RequestBody / @Valid.
     * 
     * @param ex The validation exception containing field errors
     * @param request The web request that caused the validation failure
     * @return ResponseEntity with validation error details
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
     * 
     * @param ex The exception indicating JSON parsing failure
     * @param request The web request that caused the parsing error
     * @return ResponseEntity with error details
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
     * 
     * @param ex The exception indicating resource not found
     * @param request The web request that caused the lookup failure
     * @return ResponseEntity with 404 error details
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
     * Catch-all for unexpected exceptions not handled by specific handlers.
     * 
     * @param ex The unexpected exception
     * @param request The web request that caused the error
     * @return ResponseEntity with 500 error details
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
     * Handles rate limiting violations from Resilience4j @RateLimiter.
     * 
     * @param ex The rate limiting exception
     * @param request The web request that exceeded the rate limit
     * @return ResponseEntity with 429 error details
     */
    @ExceptionHandler(RequestNotPermitted.class)
    protected ResponseEntity<ErrorResponse> handleRateLimit(
            RequestNotPermitted ex,
            WebRequest request
    ) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "Rate limit exceeded, please retry in a bit.",
                null
        );
        return new ResponseEntity<>(body, HttpStatus.TOO_MANY_REQUESTS);
    }


    /**
     * Standard error payload for all handlers.
     * 
     * @param timestamp When the error occurred
     * @param status HTTP status code
     * @param error Error message
     * @param details Additional error details or context
     */
    public record ErrorResponse(Instant timestamp, int status, String error, Object details) {}
}
