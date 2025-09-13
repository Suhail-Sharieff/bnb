package com.example.demo.dto;

public class BudgetRequestDTO {
    private double amount;
    private Long vendorId;

    public BudgetRequestDTO() {}
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
}
