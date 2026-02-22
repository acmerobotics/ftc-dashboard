package com.acmerobotics.dashboard;

public class HardwareConfig {
    private String name;
    private String xmlContent;
    private boolean readOnly;

    public HardwareConfig(String name, String xmlContent, boolean readOnly) {
        this.name = name;
        this.xmlContent = xmlContent;
        this.readOnly = readOnly;
    }

    public String getName() { return name; }
    public String getXmlContent() { return xmlContent; }
    public boolean isReadOnly() { return readOnly; }
}
