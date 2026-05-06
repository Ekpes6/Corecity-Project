FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
COPY file-service/pom.xml ./file-service/pom.xml
COPY file-service/src ./file-service/src
RUN mvn -B -ntp -Dstyle.color=never -f file-service/pom.xml package -Dmaven.test.skip=true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# fontconfig + freetype are required by Java2D (used for watermarking) on Alpine.
# Without them, Graphics2D rendering throws native UnsatisfiedLinkError at runtime.
RUN apk add --no-cache fontconfig freetype
COPY --from=build /app/file-service/target/*.jar app.jar
# -Djava.awt.headless=true is required for AWT/Java2D in Docker (no display available).
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-jar", "app.jar"]
