package com.corecity.property.repository;

import com.corecity.property.dto.LocationDTOs.LgaOption;
import com.corecity.property.dto.LocationDTOs.StateOption;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class LocationRepository {

    private final JdbcClient jdbcClient;

    public List<StateOption> findStates() {
        return jdbcClient.sql("""
                SELECT id, name
                FROM states
                ORDER BY name
                """)
            .query((rs, rowNum) -> new StateOption(
                rs.getInt("id"),
                rs.getString("name")))
            .list();
    }

    public List<LgaOption> findLgasByStateId(Integer stateId) {
        return jdbcClient.sql("""
                SELECT id, name, state_id
                FROM lgas
                WHERE state_id = :stateId
                ORDER BY name
                """)
            .param("stateId", stateId)
            .query((rs, rowNum) -> new LgaOption(
                rs.getInt("id"),
                rs.getString("name"),
                rs.getInt("state_id")))
            .list();
    }

    public boolean stateExists(Integer stateId) {
        Integer count = jdbcClient.sql("SELECT COUNT(*) FROM states WHERE id = :stateId")
            .param("stateId", stateId)
            .query(Integer.class)
            .single();
        return count != null && count > 0;
    }

    public boolean lgaExistsForState(Integer lgaId, Integer stateId) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM lgas
                WHERE id = :lgaId AND state_id = :stateId
                """)
            .param("lgaId", lgaId)
            .param("stateId", stateId)
            .query(Integer.class)
            .single();
        return count != null && count > 0;
    }
}