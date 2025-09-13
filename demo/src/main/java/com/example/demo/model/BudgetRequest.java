 package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
public class BudgetRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double amount;

    @ManyToOne
    @JoinColumn(name = "vendor_id", nullable = false)
    @JsonBackReference
    private Vendor vendor;

    @Enumerated(EnumType.STRING)
    private BudgetStatus status = BudgetStatus.PENDING;

    private LocalDateTime requestedAt = LocalDateTime.now();

    // New field for tracking who requested the budget
    private String requestedBy;

    // Constructors
    public BudgetRequest() {}

    public BudgetRequest(double amount, Vendor vendor) {
        this.amount = amount;
        this.vendor = vendor;
        this.status = BudgetStatus.PENDING;
    }

    public BudgetRequest(double amount, Vendor vendor, String requestedBy) {
        this.amount = amount;
        this.vendor = vendor;
        this.requestedBy = requestedBy;
        this.status = BudgetStatus.PENDING;
    }

    // Getters & Setters
    public Long getId() {
        return id;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public BudgetStatus getStatus() {
        return status;
    }

    public void setStatus(BudgetStatus status) {
        this.status = status;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public Vendor getVendor() {
        return vendor;
    }

    public void setVendor(Vendor vendor) {
        this.vendor = vendor;
    }

    // New getter/setter for requestedBy
    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }
}