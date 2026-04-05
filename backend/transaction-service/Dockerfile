FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
COPY transaction-service/pom.xml ./transaction-service/pom.xml
COPY transaction-service/src ./transaction-service/src
RUN mvn -B -ntp -Dstyle.color=never -f transaction-service/pom.xml package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/transaction-service/target/*.jar app.jar
ENTRYPOINT ["java","-jar","app.jar"]
