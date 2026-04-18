FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
COPY property-service/pom.xml ./property-service/pom.xml
RUN mvn -B -ntp -Dstyle.color=never -f property-service/pom.xml dependency:go-offline
COPY property-service/src ./property-service/src
RUN mvn -B -ntp -Dstyle.color=never -f property-service/pom.xml package -o

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/property-service/target/*.jar app.jar
ENTRYPOINT ["java","-jar","app.jar"]
