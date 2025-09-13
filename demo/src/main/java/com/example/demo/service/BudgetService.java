package com.example.demo.service;

import com.example.demo.model.BudgetRequest;
import com.example.demo.model.BudgetStatus;
import com.example.demo.model.Vendor;
import com.example.demo.repository.BudgetRequestRepository;
import com.example.demo.repository.VendorRepository;

import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
public class BudgetService {

    private final BudgetRequestRepository budgetRepo;
    private final VendorRepository vendorRepo; 

    public BudgetService(BudgetRequestRepository budgetRepo,VendorRepository vendorRepo) {
        this.budgetRepo = budgetRepo;
        this.vendorRepo=vendorRepo;
    }

    public BudgetRequest updateBudgetStatus(Long id, String status) {
    BudgetRequest request = budgetRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

    request.setStatus(BudgetStatus.valueOf(status));
    BudgetRequest updated = budgetRepo.save(request);
    notifyUser(updated, "Your budget request status has been updated to " + status + "!");
    return updated;
}

        public BudgetRequest createRequest(BudgetRequest request) {
        // Fetch full vendor from DB
        Vendor vendor = vendorRepo.findById(request.getVendor().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor not found"));

        request.setVendor(vendor);       // attach full Vendor
        request.setStatus(BudgetStatus.PENDING);

        BudgetRequest saved = budgetRepo.save(request);
        notifyUser(saved, "Your budget request is submitted!");
        return saved;
    }

    public BudgetRequest allocateBudget(Long id) {
        BudgetRequest request = budgetRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

        request.setStatus(BudgetStatus.ALLOCATED);
        BudgetRequest updated = budgetRepo.save(request);
        notifyUser(updated, "Your budget request has been allocated!");
        return updated;
    }

    public List<BudgetRequest> getAllRequests() {
        return budgetRepo.findAll();
    }

    // Simple notification system (can later be email, SMS, etc.)
    private void notifyUser(BudgetRequest request, String message) {
        System.out.println("Notification for " + request.getVendor().getName() + ": " + message);
    }
}
