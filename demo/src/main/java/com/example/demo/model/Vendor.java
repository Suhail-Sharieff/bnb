package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;


@Entity
@Table(name = "vendors")
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


@Column(name = "name",nullable = false)
    private String name;

    @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL)
    @JsonManagedReference  // prevents infinite recursion
    private List<BudgetRequest> budgets;

    // Constructors
    public Vendor() {}
    public Vendor(String name) { 
        this.name = name;

     }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<BudgetRequest> getBudgets() { return budgets; }
    public void setBudgets(List<BudgetRequest> budgets) { this.budgets = budgets; }
}
