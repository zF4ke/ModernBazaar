package com.modernbazaar.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI bazaarOpenApi() {
        return new OpenAPI()
            .info(new Info()
                    .title("Modern Bazaar Core API")
                    .version("1.0.0")
                    .description("REST endpoints for items & snapshots"));
    }
}