
package com.example.demo.controller;

import com.example.demo.model.Vendor;
import com.example.demo.repository.VendorRepository;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController


@RequestMapping("/api/vendors")
public class VendorController {

    private final VendorRepository vendorRepository;

    public VendorController(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    @PostMapping("/test")
public String test(@RequestBody Map<String, Object> data) {
    return "Received: " + data.toString();
}

// @PostMapping(value="/add",consumes = MediaType.APPLICATION_JSON_VALUE)
// public ResponseEntity<String> addVendor(@RequestBody Map<String,String> payload) {

//     String name=payload.get("name");
//     System.out.println("recieved name:"+name);
//     return ResponseEntity.ok("recieved: "+name);
    
// }



    // Add a new vendor
    
    @PostMapping(value = "/add", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Vendor> addVendor(@RequestBody Vendor vendor) {
        try{
            System.out.println("recieved name:"+vendor.getName());
            Vendor saved=vendorRepository.save(vendor);
            return new ResponseEntity<>(saved,HttpStatus.CREATED);
        }catch(Exception e){
            e.printStackTrace();
            return new ResponseEntity<>(null,HttpStatus.INTERNAL_SERVER_ERROR);
        }

        
    }


    @GetMapping("/check-vendor/{id}")
public Vendor checkVendor(@PathVariable Long id) {
    return vendorRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor not found"));
}

    // Get vendor by id
    @GetMapping("/{id}")
    public Vendor getVendor(@PathVariable Long id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));
    }
}
