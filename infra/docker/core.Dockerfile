# stage 1: compile the app with JDK 21
# names the stage "builder" so that it can be used in the next stage
FROM eclipse-temurin:21-jdk AS builder

# set the working directory in the container
# this is the directory where the source code will be copied
# it creates a new directory called /build inside the container
WORKDIR /build

# copy the Gradle wrapper files and settings.gradle from the host machine to the container
COPY gradlew gradlew.bat ./
COPY gradle ./gradle
COPY settings.gradle ./
COPY build.gradle ./

# copy the source code from the host machine to the container
COPY core/build.gradle core/build.gradle
COPY core/src core/src

# run the Gradle build command to compile the app
# we use ./gradlew bootJar to build the application into a JAR file without running the entire lifecycle (test, check, etc.), making it faster
# in a CI pipeline we will use ./gradlew build to run all tasks and tests but here we just want it to be compiled faster
# the --no-daemon option avoids leaving gradle daemon processes running in the background and slowing down the build
# chmod +x makes the gradlew script executable
RUN chmod +x ./gradlew
RUN ./gradlew bootJar --no-daemon

# debugging step to list the contents of the build directory
# RUN find /build -maxdepth 6 -type f -name "*.jar" -print

# stage 2: create a minimal runtime image
# this stage uses a smaller JRE image to run the application because it does not need the full JDK
# the "alpine" variant is used for a smaller footprint
FROM eclipse-temurin:21-jre-alpine AS runtime
# set the working directory in the container
WORKDIR /app
# copy the compiled JAR file from the builder stage to the runtime stage
# the core-*.jar is a wildcard that matches any JAR file starting with "core-" in the build/libs directory
COPY --from=builder /build/core/build/libs/modern-bazaar-core-*.jar app.jar
# expose the port that the application will run on
EXPOSE 8080

# set environment variables for the Java application
# these options configure the Java Virtual Machine (JVM) to use a minimum heap size of 512 MB and a maximum heap size of 1 GB
# it also enables the G1 Garbage Collector (G1GC), which is suitable for applications with large heaps and low pause time requirements
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/app/heapdumps -Xlog:gc*:file=/app/logs/gc.log:tags,uptime,level"

# healthcheck to ensure the application is running
# this command checks the health of the application by making a request to the /actuator/health endpoint every 30 seconds
# if the health check fails, the container will be marked as unhealthy
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep UP || exit 1

# defines the command to run the application
#ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]