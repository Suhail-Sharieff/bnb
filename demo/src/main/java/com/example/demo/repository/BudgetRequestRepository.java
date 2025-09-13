package com.example.demo.repository;



import com.example.demo.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BudgetRequestRepository extends JpaRepository<BudgetRequest, Long> {
    List<BudgetRequest> findByVendorId(Long vendorId);
    List<BudgetRequest> findByStatus(BudgetStatus status);
}
