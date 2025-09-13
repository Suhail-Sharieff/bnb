package com.example.demo.controller;

import com.example.demo.model.BudgetRequest;
import com.example.demo.model.Vendor;
import com.example.demo.repository.VendorRepository;
import com.example.demo.service.BudgetService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/budget-requests")
public class BudgetController {

    private final BudgetService budgetService;
    private final VendorRepository vendorRepository;

    public BudgetController(BudgetService budgetService,VendorRepository vendorRepository) {
        this.budgetService = budgetService;
        this.vendorRepository=vendorRepository;
    }

    // ===================== Vendor Endpoints =====================


    @GetMapping("/vendors/{id}")
public Vendor getVendor(@PathVariable Long id) {
    return vendorRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor not found"));
}

    // Vendor submits a new budget request
    @PostMapping("/submit")
    public BudgetRequest submitRequest(@RequestBody BudgetRequest request) {
        return budgetService.createRequest(request);
    }

    // ===================== Admin Endpoints =====================

    // Admin views all budget requests
    @GetMapping("/all")
    public List<BudgetRequest> getAllRequests() {
        return budgetService.getAllRequests();
    }

    // Admin allocates a budget to a specific request
    @PutMapping("/{id}/allocate")
    public BudgetRequest allocateBudget(@PathVariable Long id) {
        return budgetService.allocateBudget(id);
    }

    // Admin can approve a budget request
    @PutMapping("/{id}/approve")
    public BudgetRequest approveBudget(@PathVariable Long id) {
        return budgetService.updateBudgetStatus(id, "APPROVED");
    }

    // Admin can reject a budget request
    @PutMapping("/{id}/reject")
    public BudgetRequest rejectBudget(@PathVariable Long id) {
        return budgetService.updateBudgetStatus(id, "REJECTED");
    }
}
