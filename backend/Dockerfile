FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Install python3, py3-pip and python libraries for Excel-less merge script
RUN apk add --no-cache python3 py3-pip && \
    pip install --no-cache-dir openpyxl msoffcrypto-tool --break-system-packages

COPY --from=builder /app/target/*.jar app.jar
EXPOSE 3001
ENTRYPOINT ["java", "-jar", "app.jar"]
