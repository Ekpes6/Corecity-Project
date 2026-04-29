package com.corecity.user.repository;

import com.corecity.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    List<User> findByRole(User.Role role);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByEmailOrName(@Param("q") String q);
}
