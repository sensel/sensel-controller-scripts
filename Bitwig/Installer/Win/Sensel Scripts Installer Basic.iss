; Script generated by the Inno Script Studio Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "Sensel Morph Bitwig Control Scripts"
#define MyAppVersion "0.1"
#define MyAppPublisher "Sensel, Inc."
#define MyAppURL "http://www.sensel.com/"
#define MyAppExeName "SenselMorph_BitwigScripts.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)

AppId={{6BAEAE04-9E31-47D0-B30C-B0166581E500}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={userdocs}\Bitwig Studio
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=SenselMorph_Bitwig_Setup
Compression=lzma
SolidCompression=yes
CreateAppDir=no
LicenseFile=EULA.txt
SignTool=signtool
OutputDir=.


[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; NOTE: Don't use "Flags: ignoreversion" on any shared system files
Source: "..\..\..\Bitwig\SenselMorph\*"; DestDir: "{userdocs}\Bitwig Studio\Controller Scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Bitwig\Project\*"; DestDir: "{userdocs}\Sensel Morph\Bitwig Studio Script Project\"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Bitwig\Overlays\*"; DestDir: "{userdocs}\Sensel Morph\Bitwig Overlay Maps\"; Flags: ignoreversion recursesubdirs createallsubdirs

[Code]
