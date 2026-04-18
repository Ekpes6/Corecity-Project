FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
COPY file-service/pom.xml ./file-service/pom.xml
RUN mvn -B -ntp -Dstyle.color=never -f file-service/pom.xml dependency:go-offline
COPY file-service/src ./file-service/src
RUN mvn -B -ntp -Dstyle.color=never -f file-service/pom.xml package -o -Dmaven.test.skip=true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/file-service/target/*.jar app.jar
ENTRYPOINT ["java","-jar","app.jar"]
